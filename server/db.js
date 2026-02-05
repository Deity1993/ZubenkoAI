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
    // Migration: user_config ohne n8n, mit eleven_labs_chat_agent_id
    try {
      const tableInfo = db.exec("PRAGMA table_info(user_config)");
      const rows = tableInfo?.[0]?.values ?? [];
      const cols = rows.map((r) => r[1]);
      if (cols.includes('n8n_webhook_url') || !cols.includes('eleven_labs_chat_agent_id')) {
        db.run(`CREATE TABLE user_config_new (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          eleven_labs_key TEXT DEFAULT '',
          eleven_labs_agent_id TEXT DEFAULT '',
          eleven_labs_chat_agent_id TEXT DEFAULT '',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`INSERT INTO user_config_new (user_id, eleven_labs_key, eleven_labs_agent_id, eleven_labs_chat_agent_id, updated_at)
          SELECT user_id, eleven_labs_key, eleven_labs_agent_id, '', updated_at FROM user_config`);
        db.run('DROP TABLE user_config');
        db.run('ALTER TABLE user_config_new RENAME TO user_config');
        saveDb();
      }
    } catch (_) { /* Migration fehlgeschlagen oder nicht nötig */ }
    try {
      db.run('ALTER TABLE user_config ADD COLUMN eleven_labs_chat_agent_id TEXT DEFAULT ""');
      saveDb();
    } catch (_) { /* Spalte existiert bereits */ }
    // Migration: sip_config Tabelle erstellen falls nicht vorhanden
    try {
      db.run(`CREATE TABLE sip_config (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        registrar TEXT DEFAULT '',
        port INTEGER DEFAULT 5060,
        protocol TEXT DEFAULT 'TCP',
        websocket_url TEXT DEFAULT '',
        username TEXT DEFAULT '',
        password TEXT DEFAULT '',
        display_name TEXT DEFAULT '',
        certificate_path TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      saveDb();
    } catch (_) { /* Tabelle existiert bereits */ }
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
        eleven_labs_chat_agent_id TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`
      CREATE TABLE sip_config (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        registrar TEXT DEFAULT '',
        port INTEGER DEFAULT 5060,
        protocol TEXT DEFAULT 'TCP',
        websocket_url TEXT DEFAULT '',
        username TEXT DEFAULT '',
        password TEXT DEFAULT '',
        display_name TEXT DEFAULT '',
        certificate_path TEXT DEFAULT '',
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
