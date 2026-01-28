import express from 'express';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = 3001;

app.use(express.json());

const db = await open({
  filename: './database.db',
  driver: sqlite3.Database
});

// Endpoint para instalar la tabla
app.get('/install', async (req, res) => {
  try {
    const row = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    
    if (row) {
      return res.json([{ message: 'La tabla users ya existe', alreadyExists: true }]);
    }
    
    const createTable = `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await db.exec(createTable);
    res.json([{ message: 'Tabla users creada exitosamente', alreadyExists: false }]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
app.get('/users', async (req, res) => {
  try {
    const users = await db.all('SELECT id, name, email, created_at FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
app.get('/users/:id', async (req, res) => {
  try {
    const user = await db.get('SELECT id, name, email, created_at FROM users WHERE id = ?', req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json([user]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user
app.post('/users', async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y password son requeridos' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', name, email, hashedPassword);
    res.status(201).json([{ id: result.lastID }]);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update user
app.put('/users/:id', async (req, res) => {
  const { name, email, password } = req.body;
  const userId = req.params.id;
  
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const updateName = name || user.name;
    const updateEmail = email || user.email;
    const updatePassword = password ? await bcrypt.hash(password, 10) : user.password;
    
    await db.run('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?', updateName, updateEmail, updatePassword, userId);
    res.json([{ id: parseInt(userId), updated: true }]);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }
  
  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', email);
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    res.json([{
      id: user.id,
      name: user.name,
      email: user.email
    }]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear usuarios de prueba
app.get('/seed', async (req, res) => {
  const testUsers = [
    { name: 'Juan Pérez', email: 'juan@test.com', password: 'password123' },
    { name: 'María García', email: 'maria@test.com', password: 'password123' },
    { name: 'Carlos López', email: 'carlos@test.com', password: 'password123' }
  ];
  
  try {
    const created = [];
    
    for (const user of testUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      try {
        const result = await db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', user.name, user.email, hashedPassword);
        created.push({ id: result.lastID, email: user.email, status: 'creado' });
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          created.push({ email: user.email, status: 'ya existe' });
        } else {
          throw error;
        }
      }
    }
    
    res.json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
