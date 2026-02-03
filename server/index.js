import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { initDb, getDb } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'zubenkoai-secret-change-in-production';
const distPath = join(__dirname, '..', 'dist');
const PORT = process.env.PORT || (existsSync(distPath) ? 3000 : 3001);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

await initDb();

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }
  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Token ungültig' });
  }
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
  }
  const db = getDb();
  const stmt = db.prepare('SELECT id, password_hash FROM users WHERE username = ?');
  stmt.bind([username]);
  let result = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    result = { id: row.id, password_hash: row.password_hash };
  }
  stmt.free();
  if (!result) {
    return res.status(401).json({ error: 'Falscher Benutzername oder Passwort' });
  }
  const valid = bcrypt.compareSync(password, result.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Falscher Benutzername oder Passwort' });
  }
  const token = jwt.sign({ userId: result.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

app.get('/api/config', authMiddleware, (req, res) => {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT eleven_labs_key, eleven_labs_agent_id, n8n_webhook_url, n8n_api_key FROM user_config WHERE user_id = ?'
  );
  stmt.bind([req.userId]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  if (!result) {
    return res.json({
      elevenLabsKey: '',
      elevenLabsAgentId: '',
      n8nWebhookUrl: '',
      n8nApiKey: '',
    });
  }
  res.json({
    elevenLabsKey: result.eleven_labs_key || '',
    elevenLabsAgentId: result.eleven_labs_agent_id || '',
    n8nWebhookUrl: result.n8n_webhook_url || '',
    n8nApiKey: result.n8n_api_key || '',
  });
});

if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
