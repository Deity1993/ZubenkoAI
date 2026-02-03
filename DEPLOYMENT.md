# App veröffentlichen

Diese Anleitung beschreibt, wie du ZubenkoAI online veröffentlichst.

## Voraussetzungen

- **Node.js** installiert (v18+ empfohlen)
- **Git** (für Vercel/Netlify)
- Projekt auf **GitHub** hochgeladen (empfohlen)

---

## Option 1: Vercel (empfohlen – am einfachsten)

1. **Projekt bei GitHub hochladen** (falls noch nicht geschehen):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/DEIN-USERNAME/ai-voice-to-n8n-orchestrator.git
   git push -u origin main
   ```

2. **Auf Vercel anmelden**: [vercel.com](https://vercel.com) → „Sign Up“ mit GitHub

3. **Projekt importieren**:
   - „Add New“ → „Project“
   - GitHub-Repo auswählen
   - Vercel erkennt Vite automatisch
   - „Deploy“ klicken

4. **Fertig.** Die App wird unter einer URL wie `https://dein-projekt.vercel.app` bereitgestellt.

---

## Option 2: Netlify

1. **Bei Netlify anmelden**: [netlify.com](https://netlify.com) → mit GitHub anmelden

2. **Neues Projekt**:
   - „Add new site“ → „Import an existing project“
   - GitHub verbinden und Repo auswählen
   - Build-Kommando: `npm run build`
   - Publish-Verzeichnis: `dist`

3. **Deploy** starten. Die App ist unter `https://zufallsname.netlify.app` erreichbar.

---

## Option 3: Eigenen Ubuntu-Server + eigene Domain

Detaillierte Anleitung: **[docs/UBUNTU-SELFHOST.md](docs/UBUNTU-SELFHOST.md)**

Kurz:
1. `npm run build` lokal ausführen
2. Inhalt von `dist/` per SCP auf den Server kopieren (z.B. `/var/www/zubenkoai`)
3. Nginx installieren und konfigurieren
4. SSL mit Let's Encrypt einrichten

---

## Option 4: Manuell (Build + eigener Server)

1. **Production-Build erstellen**:
   ```bash
   npm install
   npm run build
   ```

2. **Inhalt von `dist/`** auf einen beliebigen Webserver hochladen (z.B. Apache, Nginx, Hoster mit FTP).

3. **SPA-Routing**: Stelle sicher, dass alle Routen auf `index.html` weitergeleitet werden.

   **Nginx-Beispiel**:
   ```nginx
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```

---

## Option 5: Google Play Store (Android-App)

Anleitung: **[docs/PLAY-STORE.md](docs/PLAY-STORE.md)**

Die App wird mit Capacitor als native Android-App gepackt und kann im Play Store veröffentlicht werden.

---

## Option 6: GitHub Pages

1. **Vite-Konfiguration anpassen** – in `vite.config.ts`:
   ```ts
   base: '/ai-voice-to-n8n-orchestrator/',
   ```

2. **GitHub Actions** (optional): Workflow für automatisches Deployment einrichten.

---

## Hinweise

- **HTTPS** wird von den meisten Hosts automatisch bereitgestellt (Let's Encrypt).
- **ElevenLabs** und **n8n** funktionieren auch von einer gehosteten App – die API-Aufrufe laufen clientseitig.
- **localStorage** ist pro Domain – Nutzer müssen sich pro Installation/URL neu einrichten.
- Bei **CORS-Problemen** mit n8n: Webhook-URL und n8n-Instanz müssen externe Domains erlauben.
