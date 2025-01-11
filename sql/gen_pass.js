import bcrypt from 'bcrypt';
import db from "../db.js"; // O db permite efetuar ligação à base de dados

const username = "admin"
const password = 'admin';
const saltRounds = 10;

const createUser = async () => {
    try {
      // Gerar o hash da senha
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      // Inserir o usuário na base de dados
      const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
      await db.query(query, [username, hashedPassword]); // Inserção dos dados na base de dados
      console.log('Usuário criado com sucesso!');
      return;
    } catch (err) {
      console.error("Erro ao inserir na base de dados:", err);
      return;
    }
  };
  
  createUser();