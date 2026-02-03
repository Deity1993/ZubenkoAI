# Datenbank & Benutzerverwaltung

Die App nutzt eine SQLite-Datenbank im Backend. Benutzer melden sich mit vordefinierten Zugangsdaten an; die Einstellungen (ElevenLabs, n8n) werden vom Administrator pro Benutzer in der Datenbank gepflegt.

---

## Server starten

```bash
# Abhängigkeiten installieren (einmalig)
cd server && npm install

# Entwicklung: Frontend (Terminal 1) + Server (Terminal 2)
npm run dev          # Frontend auf localhost:3000
cd server && npm run start   # API auf localhost:3001

# Produktion: Alles aus einem Prozess
npm run start        # Baut Frontend, startet Server auf Port 3000
```

---

## Benutzer anlegen

```bash
cd server
npm run add-user
```

Eingabe von Benutzername und Passwort wird abgefragt.

---

## Einstellungen für einen Benutzer setzen

```bash
cd server
# Umgebungsvariablen setzen und Skript ausführen
set ELEVEN_LABS_KEY=xi-...
set ELEVEN_LABS_AGENT_ID=...
set N8N_WEBHOOK_URL=https://n8n.example.com/webhook/...
set N8N_API_KEY=optional
npm run set-config -- max
```

Ersetze `max` durch den Benutzernamen.

**Linux/macOS:**
```bash
ELEVEN_LABS_KEY=xi-... ELEVEN_LABS_AGENT_ID=... N8N_WEBHOOK_URL=... npm run set-config -- max
```

---

## Benutzer auflisten

```bash
cd server
npm run list-users
```

---

## Datenbank direkt bearbeiten

Die SQLite-Datei liegt unter `server/data/app.db`. Mit einem Tool wie [DB Browser for SQLite](https://sqlitebrowser.org/) kannst du:

- Benutzer in der Tabelle `users` anlegen/bearbeiten
- Einstellungen in `user_config` je `user_id` pflegen

**Tabellen:**

| users        |                          |
|--------------|--------------------------|
| id           | INTEGER PRIMARY KEY      |
| username     | TEXT UNIQUE              |
| password_hash| TEXT (bcrypt)            |

| user_config  |                          |
|--------------|--------------------------|
| user_id      | INTEGER (→ users.id)     |
| eleven_labs_key | TEXT                 |
| eleven_labs_agent_id | TEXT            |
| n8n_webhook_url | TEXT               |
| n8n_api_key  | TEXT                     |

**Passwort-Hash:** Mit Node.js erzeugen:
```js
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('dein-passwort', 10));
```

---

## Umgebungsvariablen (Produktion)

- `JWT_SECRET` – Geheimer Schlüssel für JWT (unbedingt setzen!)
- `PORT` – Server-Port (Standard: 3000 in Produktion)
