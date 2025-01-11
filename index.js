/**
 * Servidor Express para um blog com autenticação e criação de posts
 * 
 * Funcionalidades principais:
 * - Criação de posts com Título, Conteúdo e uma Imagem
 * - Autenticação JWT com cookies HttpOnly
 * - Upload de imagens com validação
 * - Proteção contra XSS e outras vulnerabilidades
 * - Sistema de posts com validação
 */

import express from "express"; // O Express é usado para configurar o servidor, as rotas e lidar com as requisições HTTP.
import db from "./db.js"; // O db permite efetuar ligação à base de dados
import multer from "multer"; // O multer é utilizado para gerir o upload de arquivos. Guarda os arquivos temporariamente na pasta uploads/ configurada com o parametro dest.
import dotenv from "dotenv"; // Permite associar um ficheiro .env
import { body, validationResult } from "express-validator";
import helmet from "helmet"
import jwt from "jsonwebtoken"; // Autenticação por Token
import bcrypt from 'bcrypt'; // Hash específica para senhas
import xss from 'xss'; // Sanitiza dados e evita injeção de código
import cookieParser from 'cookie-parser';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000; // Define a porta no ficheiro .env ou 3000
const upload = multer({ 
  dest: "uploads/",  // Definição da pasta 'uploads' para guardar arquivos
  limits:{fileSize: 10 * 1024 * 1024}, // Limita a 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];
    if(allowedMimeTypes.includes(file.mimetype)){
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido"));
    }
  },
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads")); // Servir arquivos estáticos da pasta 'uploads'
app.use(helmet()); // Middleware de segurança
app.use(cookieParser());  // Isso é necessário para acessar req.cookies

// Função que retorna o Post através de um ID
async function getPostById(id) {
  const query = "SELECT * FROM posts WHERE id = ?";
  const [rows] = await db.query(query, [id]);
  return rows[0]; // Retorna o primeiro resultado
}

// Middleware da Autenticação por Token
const authenticateToken = (req, res, next) => {
  // Tenta obter o token do cabeçalho Authorization ou do cookie
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1] || req.cookies?.auth_token;
  if (!token) {
    // Caso não haja utilizador, permite continuar sem utilizador
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // Caso não haja utilizador, permite continuar sem utilizador
      req.user = null;
      return next();
    }
    
    req.user = user; // Decodifica e salva o usuário na requisição
    console.log("User autenticado: ", user)
    next();
  });
};

// Global middleware to check auth on every request
app.use(authenticateToken);

// Middleware for protected routes
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).send("Acesso negado!");
  }
  next();
};

// Middleware global para passar o usuário para todas as views
app.use((req, res, next) => {
  console.log("Global middleware - user:", req.user);
  res.locals.user = req.user || null; // Passa o 'user' para o template
  next();
});

app.get("/", async (req, res) => {
  try {
    const [posts] = await db.query(
      "SELECT * FROM posts ORDER BY created_at DESC"
    );
    res.render("home.ejs", { posts });
  } catch (err) {
    console.error("Erro ao buscar posts: ", err); 
    res.status(500).end("Erro ao carregar os posts.");
  }
});

app.get("/post/:id", async (req, res) => {
  const postId = req.params.id;
  try {
    const post = await getPostById(postId);
    if (post) {
      res.render("post.ejs", { post });
    } else {
      res.status(404).send("Post não encontrado");
    }
  } catch (err) {
    console.error("Erro ao buscar post:", err);
    res.status(500).send("Erro no servidor");
  }
});

app.get("/new-post", (req, res) => {
  res.render("new-post.ejs");
});

app.get("/about-me", (req, res) => {
  res.render("about-me.ejs");
});

// Rota para lidar com acesso ao login
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

// Rota para realizar logout
app.get("/logout", (req, res) => {
  res.clearCookie("auth_token"); // Limpa o cookie com o token de autenticação
  res.redirect("/"); // Redireciona para a home
});

// Rota para lidar com post no login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const query = "SELECT * FROM users WHERE username = ?";
    const [rows] = await db.query(query, [username]);
    if (rows.length === 0) {
      return res.status(401).send("Usuário ou senha inválidos.");
    }
    const user = rows[0];

    // Verifica a senha usando bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send("Usuário ou senha inválidos.");
    }
    
    console.log("User data being signed:", { id: user.id, username: user.username, role: user.role });

    // Gera o token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    console.log("Token gerado: ", token);
    res.cookie("auth_token", token, { httpOnly: true, secure: false, maxAge: 3600000 });
    res.redirect("/");
  } catch (err) {
    console.error("Erro ao realizar login:", err);
    res.status(500).send("Erro no servidor.");
  }
});

// Rota para lidar com submição de Posts
app.post(
  "/submit",
  requireAuth,
  upload.single("image"),
  // Utilização do middleware upload.single("image") que lida com o upload de um único arquivo no campo com nome image
  // Após o upload, o arquivo é acessível através do req.file
  [
    // Validação do Título e do Conteúdo em backend. Garante:
    // 1. Segurança e consistência.
    // 2. Evita manipulação ou ataques feitos diretamente ao servidor.
    body("title")
      .trim()
      .notEmpty().withMessage("O título é obrigatório.")
      .isLength({ max: 100 }).withMessage("O título pode ter no máximo 100 caracteres.")
      .isLength({ min: 5 }).withMessage("O título deve conter no mínimo 5 caracteres."),
    body("content")
      .trim()
      .notEmpty().withMessage("O conteúdo é obrigatório.")
      .isLength({ max: 5000 }).withMessage("O conteúdo pode ter no máximo 5000 caracteres.")
      .isLength({ min: 1000 }).withMessage("O conteúdo deve conter no mínimo 1000 caracteres."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Se os critérios não forem respeitados são retornados os erros no array errors.
    const { title, content } = req.body;
    const sanitizedContent = xss(content); // Sanitiza o conteúdo HTML
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null; // Caminho da imagem

    if (!title || !sanitizedContent || !imagePath) {
      return res.status(400).send("Título, conteúdo e imagem são obrigatórios!");
    } else {
      try {
        const query = `INSERT INTO posts(title, content, image_path) VALUES (?, ?, ?)`;
        await db.query(query, [title, sanitizedContent, imagePath]); // Inserção dos dados na base de dados
        res.redirect("/");
      } catch (err) {
        console.error("Erro ao inserir na base de dados:", err);
        res.status(500).send("Erro ao salvar os dados na base de dados.");
      }
    }
  }
);

// Middleware global de tratamento de erros
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).send("O arquivo excede o tamanho máximo permitido (10MB).");
    }
    if (err.message === "Tipo de arquivo não permitido") {
      return res.status(400).send("Tipo de arquivo não permitido. Apenas imagens JPEG, PNG e GIF são aceitas.");
    }
  }
  // Resposta genérica para erros inesperados
  res.status(err.status || 500).json({ error: "Ocorreu um erro no servidor. Tente novamente mais tarde." });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
