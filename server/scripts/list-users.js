import { initDb, getDb } from '../db.js';

await initDb();
const db = getDb();
const stmt = db.prepare('SELECT id, username, created_at FROM users ORDER BY id');
console.log('ID | Benutzername | Erstellt');
console.log('---|--------------|----------');
while (stmt.step()) {
  const row = stmt.getAsObject();
  console.log(`${row.id}  | ${row.username} | ${row.created_at}`);
}
stmt.free();
