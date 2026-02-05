import { initDb, getDb, save } from '../db.js';

await initDb();
const db = getDb();

const username = process.env.USERNAME || 'test';

try {
  db.run('UPDATE users SET is_admin = 1 WHERE username = ?', [username]);
  save();
  console.log(`Benutzer "${username}" ist jetzt Admin.`);
} catch (e) {
  console.error('Fehler:', e.message || e);
  process.exit(1);
}
