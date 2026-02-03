# ZubenkoAI

Voice-to-n8n mit ElevenLabs-Integration.

## Lokal starten

**Voraussetzung:** Node.js (v18+)

```bash
npm install
cd server && npm install && cd ..
npm run seed          # Erstellt Test-Benutzer (admin / admin123)
npm run dev           # Frontend auf localhost:3000
# Terminal 2: cd server && npm run start   # API auf localhost:3001
```

Oder für Produktion (ein Prozess):

```bash
npm run start         # Baut & startet auf Port 3000
```

**Anmeldung:** Benutzername und Passwort (vordefiniert vom Admin). Einstellungen werden in der Datenbank verwaltet – siehe [docs/DATENBANK.md](docs/DATENBANK.md).

## Ubuntu-Server hochladen

Kurze Anleitung: **[DEPLOY.md](DEPLOY.md)**

## Veröffentlichen

Siehe [DEPLOYMENT.md](DEPLOYMENT.md) für Anleitungen zu:

- **Vercel** (empfohlen)
- **Netlify**
- **Eigener Ubuntu-Server + Domain** → [docs/UBUNTU-SELFHOST.md](docs/UBUNTU-SELFHOST.md)
- **Google Play Store** → [docs/PLAY-STORE.md](docs/PLAY-STORE.md)
- **GitHub Pages**
