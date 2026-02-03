import { initDb, save } from '../db.js';

await initDb();
save();
console.log('Datenbank initialisiert: server/data/app.db');
