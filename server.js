import express from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = 3001;

app.use(express.json());

const db = new sqlite3.Database('database.db');

// Endpoint para instalar la tabla
app.get('/install', (req, res) => {
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", [], (error, row) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
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
    
    db.run(createTable, (error) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      
      res.json([{ message: 'Tabla users creada exitosamente', alreadyExists: false }]);
    });
  });
});

// Get all users
app.get('/users', (req, res) => {
  db.all('SELECT id, name, email, created_at FROM users', [], (error, users) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json(users);
  });
});

// Get user by ID
app.get('/users/:id', (req, res) => {
  db.get('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.params.id], (error, user) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json([user]);
  });
});

// Create user
app.post('/users', async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y password son requeridos' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', 
      [name, email, hashedPassword], 
      function(error) {
        if (error) {
          if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'El email ya está registrado' });
          }
          return res.status(500).json({ error: error.message });
        }
        
        res.status(201).json([{ id: this.lastID }]);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
app.put('/users/:id', async (req, res) => {
  const { name, email, password } = req.body;
  const userId = req.params.id;
  
  db.get('SELECT * FROM users WHERE id = ?', [userId], async (error, user) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const updateName = name || user.name;
    const updateEmail = email || user.email;
    let updatePassword = user.password;
    
    if (password) {
      updatePassword = await bcrypt.hash(password, 10);
    }
    
    db.run('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?',
      [updateName, updateEmail, updatePassword, userId],
      (error) => {
        if (error) {
          if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'El email ya está registrado' });
          }
          return res.status(500).json({ error: error.message });
        }
        
        res.json([{ id: parseInt(userId), updated: true }]);
      }
    );
  });
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (error, user) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    try {
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
      
      await new Promise((resolve, reject) => {
        db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', 
          [user.name, user.email, hashedPassword], 
          function(error) {
            if (error) {
              if (error.message.includes('UNIQUE constraint failed')) {
                resolve({ email: user.email, status: 'ya existe' });
              } else {
                reject(error);
              }
            } else {
              resolve({ id: this.lastID, email: user.email, status: 'creado' });
            }
          }
        );
      }).then(result => created.push(result));
    }
    
    res.json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
