const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

let db = null;

try {
  db = require('./database/db');
} catch (error) {
  console.warn('SQLite no disponible, arrancando solo con el frontend.');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function initAdmin() {
  if (!db) {
    return;
  }

  const existing = db.prepare('SELECT * FROM admin_accounts WHERE username = ?').get('admin');
  if (!existing) {
    const hashedPassword = hashPassword('admin123');
    db.prepare(`
      INSERT INTO admin_accounts (username, password_hash, account_role)
      VALUES (?, ?, ?)
    `).run('admin', hashedPassword, 'admin');
    console.log('Default admin account created: username=admin, password=admin123');
  }
}

initAdmin();

app.post('/api/login', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'La base local no está disponible' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  const account = db.prepare('SELECT * FROM admin_accounts WHERE username = ?').get(username);

  if (!account) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const hashedPassword = hashPassword(password);
  if (hashedPassword !== account.password_hash) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  res.json({
    success: true,
    user: {
      id: account.id,
      username: account.username,
      accountRole: account.account_role,
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'JowAdmin API is running' });
});

const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  if (db) {
    console.log('📌 Cuenta admin por defecto: admin / admin123\n');
  } else {
    console.log('📌 Modo frontend-only activo\n');
  }
});
