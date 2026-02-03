import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data', 'app.db');

let db = null;

export async function initDb() {
  const SQL = await initSqlJs();
  const dbDir = dirname(DB_PATH);
  if (!existsSync(dbDir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(dbDir, { recursive: true });
  }
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    // Migration: Spalten is_admin und is_locked hinzufügen falls nicht vorhanden
    try {
      db.run('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
      saveDb();
    } catch (_) { /* Spalte existiert bereits */ }
    try {
      db.run('ALTER TABLE users ADD COLUMN is_locked INTEGER DEFAULT 0');
      saveDb();
    } catch (_) { /* Spalte existiert bereits */ }
    // Ersten Benutzer (admin) zum Admin machen falls noch keiner Admin ist
    const adminCheck = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_admin = 1');
    adminCheck.step();
    const { c } = adminCheck.getAsObject();
    adminCheck.free();
    if (c === 0) {
      db.run("UPDATE users SET is_admin = 1 WHERE username = 'admin'");
      saveDb();
    }
  } else {
    db = new SQL.Database();
    db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0,
        is_locked INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`
      CREATE TABLE user_config (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        eleven_labs_key TEXT DEFAULT '',
        eleven_labs_agent_id TEXT DEFAULT '',
        n8n_webhook_url TEXT DEFAULT '',
        n8n_api_key TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    saveDb();
  }
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
  }
}

export function getDb() {
  return db;
}

export function save() {
  saveDb();
}
