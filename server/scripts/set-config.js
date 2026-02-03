import { initDb, getDb, save } from '../db.js';

const username = process.argv[2];
if (!username) {
  console.log('Verwendung: node set-config.js <benutzername>');
  console.log('Setze Umgebungsvariablen: ELEVEN_LABS_KEY, ELEVEN_LABS_AGENT_ID, ELEVEN_LABS_CHAT_AGENT_ID');
  process.exit(1);
}

await initDb();
const db = getDb();

const stmt = db.prepare('SELECT id FROM users WHERE username = ?');
stmt.bind([username]);
const row = stmt.step() ? stmt.getAsObject() : null;
stmt.free();

if (!row) {
  console.error('Benutzer nicht gefunden:', username);
  process.exit(1);
}

const elevenLabsKey = process.env.ELEVEN_LABS_KEY || '';
const elevenLabsAgentId = process.env.ELEVEN_LABS_AGENT_ID || '';
const elevenLabsChatAgentId = process.env.ELEVEN_LABS_CHAT_AGENT_ID || '';

const checkStmt = db.prepare('SELECT user_id FROM user_config WHERE user_id = ?');
checkStmt.bind([row.id]);
const exists = checkStmt.step();
checkStmt.free();

if (exists) {
  const upd = db.prepare(`
    UPDATE user_config SET
      eleven_labs_key = ?, eleven_labs_agent_id = ?, eleven_labs_chat_agent_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `);
  upd.run([elevenLabsKey, elevenLabsAgentId, elevenLabsChatAgentId, row.id]);
  upd.free();
} else {
  db.run(
    'INSERT INTO user_config (user_id, eleven_labs_key, eleven_labs_agent_id, eleven_labs_chat_agent_id) VALUES (?, ?, ?, ?)',
    [row.id, elevenLabsKey, elevenLabsAgentId, elevenLabsChatAgentId]
  );
}
save();

console.log(`Konfiguration für "${username}" gespeichert.`);
