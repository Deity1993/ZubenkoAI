import { initDb, getDb, save } from '../db.js';

const username = process.argv[2];
if (!username) {
  console.log('Verwendung: node set-config.js <benutzername>');
  console.log('Setze Umgebungsvariablen: ELEVEN_LABS_KEY, ELEVEN_LABS_AGENT_ID, N8N_WEBHOOK_URL, N8N_API_KEY');
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
const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || '';
const n8nApiKey = process.env.N8N_API_KEY || '';

const checkStmt = db.prepare('SELECT user_id FROM user_config WHERE user_id = ?');
checkStmt.bind([row.id]);
const exists = checkStmt.step();
checkStmt.free();

if (exists) {
  const upd = db.prepare(`
    UPDATE user_config SET
      eleven_labs_key = ?, eleven_labs_agent_id = ?, n8n_webhook_url = ?, n8n_api_key = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `);
  upd.run([elevenLabsKey, elevenLabsAgentId, n8nWebhookUrl, n8nApiKey, row.id]);
  upd.free();
} else {
  db.run(
    'INSERT INTO user_config (user_id, eleven_labs_key, eleven_labs_agent_id, n8n_webhook_url, n8n_api_key) VALUES (?, ?, ?, ?, ?)',
    [row.id, elevenLabsKey, elevenLabsAgentId, n8nWebhookUrl, n8nApiKey]
  );
}
save();

console.log(`Konfiguration für "${username}" gespeichert.`);
