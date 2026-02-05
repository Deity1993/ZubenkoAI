import bcrypt from 'bcryptjs';
import { initDb, getDb, save } from '../db.js';

await initDb();
const db = getDb();

const username = process.env.SEED_USER || 'admin';
const password = process.env.SEED_PASSWORD || 'admin123';

const hash = bcrypt.hashSync(password, 10);
try {
  db.run('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)', [username, hash]);
  const stmt = db.prepare('SELECT id FROM users WHERE username = ?');
  stmt.bind([username]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  if (row) {
    db.run('INSERT INTO user_config (user_id) VALUES (?)', [row.id]);
    db.run('INSERT INTO sip_config (user_id) VALUES (?)', [row.id]);
  }
  save();
  console.log(`Benutzer "${username}" angelegt (Passwort: ${password})`);
} catch (e) {
  if (e.message?.includes('UNIQUE')) {
    console.log('Benutzer existiert bereits.');
  } else {
    throw e;
  }
}
