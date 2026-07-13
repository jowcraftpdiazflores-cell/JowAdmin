const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './jowadmin.db';
const db = new Database(path.resolve(dbPath));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables if they don't exist
const createTables = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT UNIQUE,
      username TEXT NOT NULL,
      discriminator TEXT,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'Usuario',
      points REAL NOT NULL DEFAULT 7,
      points_last_updated TEXT,
      status TEXT NOT NULL DEFAULT 'Sin revisar',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // User cargos table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_cargos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      cargo TEXT NOT NULL,
      assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      assigned_by INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users(id),
      UNIQUE(user_id, cargo)
    );
  `);

  // Point history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS point_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      change_value REAL NOT NULL,
      reason TEXT NOT NULL,
      changed_by INTEGER,
      changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id)
    );
  `);

  // Appeals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS appeals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Abierta',
      deadline TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      resolved_by INTEGER,
      resolution TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (resolved_by) REFERENCES users(id)
    );
  `);

  // Novelties table
  db.exec(`
    CREATE TABLE IF NOT EXISTS novelties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // Admin accounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      account_role TEXT NOT NULL DEFAULT 'limited',
      discord_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (discord_id) REFERENCES users(discord_id)
    );
  `);

  // Config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default config values if they don't exist
  const insertConfig = db.prepare(`
    INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)
  `);
  insertConfig.run('points_decay_rate', '0.5');
  insertConfig.run('points_decay_interval_hours', '24');
  insertConfig.run('max_points', '7');
  insertConfig.run('min_points', '0');
};

createTables();

module.exports = db;
