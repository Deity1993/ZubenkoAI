import bcrypt from 'bcryptjs';
import { initDb, getDb, save } from '../db.js';

await initDb();
const db = getDb();

const username = (process.env.NEW_USER || '').trim();
const password = (process.env.NEW_PASSWORD || '').trim();
const isAdmin = (process.env.NEW_ADMIN || '0') === '1';

if (!username || !password) {
  console.error('NEW_USER und NEW_PASSWORD sind erforderlich.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);

try {
  db.run('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)', [username, hash, isAdmin ? 1 : 0]);
  const stmt = db.prepare('SELECT id FROM users WHERE username = ?');
  stmt.bind([username]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  if (row) {
    db.run('INSERT OR IGNORE INTO user_config (user_id) VALUES (?)', [row.id]);
    db.run('INSERT OR IGNORE INTO sip_config (user_id) VALUES (?)', [row.id]);
  }
  save();
  console.log(`Benutzer "${username}" angelegt.`);
} catch (e) {
  if (e.message?.includes('UNIQUE')) {
    console.error('Benutzername existiert bereits.');
  } else {
    console.error(e.message || e);
  }
  process.exit(1);
}
