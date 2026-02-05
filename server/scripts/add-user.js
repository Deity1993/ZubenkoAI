import bcrypt from 'bcryptjs';
import readline from 'readline';
import { initDb, getDb, save } from '../db.js';

await initDb();
const db = getDb();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

const username = await ask('Benutzername: ');
const password = await ask('Passwort: ');
rl.close();

if (!username.trim() || !password.trim()) {
  console.error('Benutzername und Passwort erforderlich.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password.trim(), 10);
try {
  db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username.trim(), hash]);
  const stmt = db.prepare('SELECT id FROM users WHERE username = ?');
  stmt.bind([username.trim()]);
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
    console.error(e.message);
  }
  process.exit(1);
}
