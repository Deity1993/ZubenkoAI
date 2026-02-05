import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { initDb, getDb, save } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'zubenkoai-secret-change-in-production';
const distPath = join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3001;

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
    req.isAdmin = !!payload.isAdmin;
    next();
  } catch {
    return res.status(401).json({ error: 'Token ungültig' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Admin-Rechte erforderlich' });
  }
  next();
}

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
    }
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Datenbank nicht verfügbar' });
    }
    const stmt = db.prepare('SELECT id, password_hash, is_locked, is_admin FROM users WHERE username = ?');
    stmt.bind([username]);
    let result = null;
    if (stmt.step()) {
      const row = stmt.getAsObject();
      result = {
        id: row.id,
        password_hash: row.password_hash,
        is_locked: row.is_locked ?? 0,
        is_admin: row.is_admin ?? 0,
      };
    }
    stmt.free();
    if (!result) {
      return res.status(401).json({ error: 'Falscher Benutzername oder Passwort' });
    }
    if (result.is_locked) {
      return res.status(403).json({ error: 'Benutzerkonto wurde gesperrt.' });
    }
    const valid = bcrypt.compareSync(password, result.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Falscher Benutzername oder Passwort' });
    }
    const isAdmin = !!result.is_admin;
    const token = jwt.sign({ userId: result.id, isAdmin }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, isAdmin, username: username });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Serverfehler bei der Anmeldung' });
  }
});

app.get('/api/me', authMiddleware, (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT username FROM users WHERE id = ?');
  stmt.bind([req.userId]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  res.json({ isAdmin: !!req.isAdmin, username: row?.username || '' });
});

app.get('/api/config', authMiddleware, (req, res) => {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT eleven_labs_key, eleven_labs_agent_id, eleven_labs_chat_agent_id FROM user_config WHERE user_id = ?'
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
      elevenLabsChatAgentId: '',
    });
  }
  res.json({
    elevenLabsKey: result.eleven_labs_key || '',
    elevenLabsAgentId: result.eleven_labs_agent_id || '',
    elevenLabsChatAgentId: result.eleven_labs_chat_agent_id || '',
  });
});

// SIP Config API
app.get('/api/sip-config', authMiddleware, (req, res) => {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT registrar, port, protocol, websocket_url, username, password, display_name, certificate_path FROM sip_config WHERE user_id = ?'
  );
  stmt.bind([req.userId]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  if (!result) {
    return res.json({
      registrar: '',
      port: 5060,
      protocol: 'TCP',
      websocketUrl: '',
      username: '',
      password: '',
      displayName: '',
      certificatePath: '',
    });
  }
  res.json({
    registrar: result.registrar || '',
    port: result.port || 5060,
    protocol: result.protocol || 'TCP',
    websocketUrl: result.websocket_url || '',
    username: result.username || '',
    password: result.password || '',
    displayName: result.display_name || '',
    certificatePath: result.certificate_path || '',
  });
});

app.post('/api/sip-config', authMiddleware, (req, res) => {
  const db = getDb();
  const { registrar, port, protocol, websocketUrl, username, password, displayName, certificatePath } = req.body;
  const userId = req.userId;

  // Prüfe ob Eintrag existiert
  const checkStmt = db.prepare('SELECT user_id FROM sip_config WHERE user_id = ?');
  checkStmt.bind([userId]);
  const configExists = checkStmt.step();
  checkStmt.free();

  try {
    if (configExists) {
      // UPDATE
      db.run(
        'UPDATE sip_config SET registrar=?, port=?, protocol=?, websocket_url=?, username=?, password=?, display_name=?, certificate_path=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?',
        [registrar || '', port || 5060, protocol || 'TCP', websocketUrl || '', username || '', password || '', displayName || '', certificatePath || '', userId]
      );
    } else {
      // INSERT
      db.run(
        'INSERT INTO sip_config (user_id, registrar, port, protocol, websocket_url, username, password, display_name, certificate_path) VALUES (?,?,?,?,?,?,?,?,?)',
        [userId, registrar || '', port || 5060, protocol || 'TCP', websocketUrl || '', username || '', password || '', displayName || '', certificatePath || '']
      );
    }
    save();
    res.json({ ok: true, message: 'SIP-Einstellungen gespeichert' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Speichern der SIP-Einstellungen', details: error.message });
  }
});

// Admin API
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT id, username, is_admin, is_locked, created_at FROM users ORDER BY username'
  );
  const users = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    users.push({
      id: row.id,
      username: row.username,
      isAdmin: !!row.is_admin,
      isLocked: !!row.is_locked,
      createdAt: row.created_at,
    });
  }
  stmt.free();
  res.json(users);
});

app.post('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
  }
  const db = getDb();
  const hash = bcrypt.hashSync(password.trim(), 10);
  try {
    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username.trim(), hash]);
    const stmt = db.prepare('SELECT id FROM users WHERE username = ?');
    stmt.bind([username.trim()]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    if (row) {
      db.run('INSERT OR IGNORE INTO user_config (user_id) VALUES (?)', [row.id]);
    }
    save();
    res.status(201).json({ id: row?.id, username: username.trim() });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Benutzername existiert bereits' });
    }
    throw e;
  }
});

// CSV Export: Alle Benutzer mit Konfiguration (muss vor :id-Routen stehen)
app.get('/api/admin/users/export', authMiddleware, adminMiddleware, (req, res) => {
  const db = getDb();
  const users = [];
  const stmt = db.prepare(`
    SELECT u.id, u.username, u.is_admin, u.is_locked, u.created_at,
           uc.eleven_labs_key, uc.eleven_labs_agent_id, uc.eleven_labs_chat_agent_id
    FROM users u
    LEFT JOIN user_config uc ON uc.user_id = u.id
    ORDER BY u.username
  `);
  while (stmt.step()) {
    const row = stmt.getAsObject();
    users.push({
      id: row.id,
      username: row.username || '',
      isAdmin: !!row.is_admin,
      isLocked: !!row.is_locked,
      createdAt: row.created_at || '',
      elevenLabsKey: row.eleven_labs_key || '',
      elevenLabsAgentId: row.eleven_labs_agent_id || '',
      elevenLabsChatAgentId: row.eleven_labs_chat_agent_id || '',
    });
  }
  stmt.free();

  const escapeCsv = (s) => {
    if (s == null || s === '') return '';
    const str = String(s);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const header = 'username,password,isAdmin,isLocked,elevenLabsKey,elevenLabsAgentId,elevenLabsChatAgentId,createdAt';
  const rows = users.map(u => [
    escapeCsv(u.username),
    '', // Passwort wird nie exportiert
    escapeCsv(u.isAdmin ? '1' : '0'),
    escapeCsv(u.isLocked ? '1' : '0'),
    escapeCsv(u.elevenLabsKey),
    escapeCsv(u.elevenLabsAgentId),
    escapeCsv(u.elevenLabsChatAgentId),
    escapeCsv(u.createdAt),
  ].join(','));
  const csv = [header, ...rows].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="zubenkoai-users.csv"');
  res.send('\uFEFF' + csv);
});

// CSV Import: Benutzer anlegen oder aktualisieren
app.post('/api/admin/users/import', authMiddleware, adminMiddleware, (req, res) => {
  const { csv } = req.body;
  if (typeof csv !== 'string' || !csv.trim()) {
    return res.status(400).json({ error: 'CSV-Inhalt fehlt' });
  }

  const parseCsvLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((c === ',' && !inQuotes) || c === '\n' || c === '\r') {
        result.push(current.trim());
        current = '';
        if (c !== ',') break;
      } else {
        current += c;
      }
    }
    result.push(current.trim());
    return result;
  };

  const lines = csv.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    return res.status(400).json({ error: 'CSV muss Header und mindestens eine Datenzeile haben' });
  }

  const headerLine = parseCsvLine(lines[0]);
  const header = headerLine.map(h => h.toLowerCase().trim());
  const col = (name) => header.indexOf(name.toLowerCase());

  const db = getDb();
  const created = [];
  const updated = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    if (parts.length < 1) continue;

    const getVal = (name, def = '') => {
      const idx = col(name);
      return idx >= 0 && parts[idx] !== undefined ? String(parts[idx]).trim() : def;
    };

    const username = getVal('username');
    const password = getVal('password');
    const isAdmin = ['1', 'true', 'ja', 'yes'].includes(getVal('isadmin', '0').toLowerCase());
    const isLocked = ['1', 'true', 'ja', 'yes'].includes(getVal('islocked', '0').toLowerCase());
    const elevenLabsKey = getVal('elevenlabskey');
    const elevenLabsAgentId = getVal('elevenlabsagentid');
    const elevenLabsChatAgentId = getVal('elevenlabschatagentid');

    if (!username) {
      errors.push(`Zeile ${i + 1}: Benutzername fehlt`);
      continue;
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?');
    existing.bind([username]);
    const exists = existing.step();
    const row = exists ? existing.getAsObject() : null;
    existing.free();

    if (exists && row) {
      const id = row.id;
      if (password) {
        const hash = bcrypt.hashSync(password, 10);
        db.run('UPDATE users SET password_hash=?, is_admin=?, is_locked=? WHERE id=?', [hash, isAdmin ? 1 : 0, isLocked ? 1 : 0, id]);
      } else {
        db.run('UPDATE users SET is_admin=?, is_locked=? WHERE id=?', [isAdmin ? 1 : 0, isLocked ? 1 : 0, id]);
      }
      const checkConfig = db.prepare('SELECT user_id FROM user_config WHERE user_id = ?');
      checkConfig.bind([id]);
      const configExists = checkConfig.step();
      checkConfig.free();
      if (configExists) {
        db.run('UPDATE user_config SET eleven_labs_key=?, eleven_labs_agent_id=?, eleven_labs_chat_agent_id=? WHERE user_id=?', [elevenLabsKey, elevenLabsAgentId, elevenLabsChatAgentId, id]);
      } else {
        db.run('INSERT INTO user_config (user_id, eleven_labs_key, eleven_labs_agent_id, eleven_labs_chat_agent_id) VALUES (?,?,?,?)', [id, elevenLabsKey, elevenLabsAgentId, elevenLabsChatAgentId]);
      }
      updated.push(username);
    } else {
      if (!password || password.length < 6) {
        errors.push(`Zeile ${i + 1}: Neuer Benutzer "${username}" braucht ein Passwort (min. 6 Zeichen)`);
        continue;
      }
      try {
        const hash = bcrypt.hashSync(password, 10);
        db.run('INSERT INTO users (username, password_hash, is_admin, is_locked) VALUES (?,?,?,?)', [username, hash, isAdmin ? 1 : 0, isLocked ? 1 : 0]);
        const sel = db.prepare('SELECT id FROM users WHERE username = ?');
        sel.bind([username]);
        const newRow = sel.step() ? sel.getAsObject() : null;
        sel.free();
        if (newRow) {
          db.run('INSERT OR REPLACE INTO user_config (user_id, eleven_labs_key, eleven_labs_agent_id, eleven_labs_chat_agent_id) VALUES (?,?,?,?)', [newRow.id, elevenLabsKey, elevenLabsAgentId, elevenLabsChatAgentId]);
          created.push(username);
        }
      } catch (e) {
        if (e.message?.includes('UNIQUE')) {
          errors.push(`Zeile ${i + 1}: Benutzername "${username}" existiert bereits`);
        } else {
          errors.push(`Zeile ${i + 1}: ${e.message}`);
        }
      }
    }
  }

  save();
  res.json({ created, updated, errors });
});

app.patch('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID' });
  const { password, isLocked, isAdmin } = req.body;
  const db = getDb();
  const updates = [];
  const params = [];
  if (typeof password === 'string' && password.trim()) {
    updates.push('password_hash = ?');
    params.push(bcrypt.hashSync(password.trim(), 10));
  }
  if (typeof isLocked === 'boolean') {
    updates.push('is_locked = ?');
    params.push(isLocked ? 1 : 0);
  }
  if (typeof isAdmin === 'boolean') {
    updates.push('is_admin = ?');
    params.push(isAdmin ? 1 : 0);
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'Keine Änderungen angegeben' });
  }
  params.push(id);
  const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  const stmt = db.prepare(sql);
  stmt.run(params);
  const changed = db.getRowsModified();
  stmt.free();
  save();
  if (changed === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  res.json({ ok: true });
});

app.get('/api/admin/users/:id/config', authMiddleware, adminMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID' });
  const db = getDb();
  const stmt = db.prepare(
    'SELECT eleven_labs_key, eleven_labs_agent_id, eleven_labs_chat_agent_id FROM user_config WHERE user_id = ?'
  );
  stmt.bind([id]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  if (!row) {
    return res.json({ elevenLabsKey: '', elevenLabsAgentId: '', elevenLabsChatAgentId: '' });
  }
  res.json({
    elevenLabsKey: row.eleven_labs_key || '',
    elevenLabsAgentId: row.eleven_labs_agent_id || '',
    elevenLabsChatAgentId: row.eleven_labs_chat_agent_id || '',
  });
});

app.put('/api/admin/users/:id/config', authMiddleware, adminMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID' });
  const { elevenLabsKey, elevenLabsAgentId, elevenLabsChatAgentId } = req.body;
  const db = getDb();
  const check = db.prepare('SELECT user_id FROM user_config WHERE user_id = ?');
  check.bind([id]);
  const exists = check.step();
  check.free();
  const ek = typeof elevenLabsKey === 'string' ? elevenLabsKey : '';
  const eid = typeof elevenLabsAgentId === 'string' ? elevenLabsAgentId : '';
  const echat = typeof elevenLabsChatAgentId === 'string' ? elevenLabsChatAgentId : '';
  if (exists) {
    const upd = db.prepare(`
      UPDATE user_config SET eleven_labs_key=?, eleven_labs_agent_id=?, eleven_labs_chat_agent_id=? WHERE user_id=?
    `);
    upd.run([ek, eid, echat, id]);
    upd.free();
  } else {
    db.run(
      'INSERT INTO user_config (user_id, eleven_labs_key, eleven_labs_agent_id, eleven_labs_chat_agent_id) VALUES (?, ?, ?, ?)',
      [id, ek, eid, echat]
    );
  }
  save();
  res.json({ ok: true });
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
