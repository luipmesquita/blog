CREATE DATABASE blog_db;
USE blog_db;

CREATE TABLE posts (
	id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
	id INT AUTO_INCREMENT PRIMARY KEY,
	username VARCHAR(255) NOT NULL,
    roleType ENUM("admin", "user"),
    password VARCHAR(255)
);

DROP TABLE posts;
DROP TABLE users;

TRUNCATE TABLE posts;

INSERT INTO 
	posts (title, image_path, content)
VALUES 
	("Férias", "/uploads/the_brutalist.jpg", "Foram espetaculares"),
    ("Viagem a Marrocos", "/uploads/the_brutalist.jpg","Foi incrível ver o deserto");
    
INSERT INTO
	users (username, roleType, password)
VALUES
	("admin", "admin", "admin"),
    ("user", "user", "user");

SELECT * FROM posts;

SELECT * from users;