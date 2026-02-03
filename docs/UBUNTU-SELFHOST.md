# App auf eigenem Ubuntu-Server hosten

Diese Anleitung erklärt, wie du ZubenkoAI auf einem Ubuntu-Server mit eigener Domain bereitstellst.

**Hinweis:** Die App hat ein Backend (Node.js + SQLite). Frontend und API laufen in einem Prozess.

---

## Voraussetzungen

- Ubuntu-Server (22.04 oder 24.04) mit Root- oder Sudo-Zugang
- Domain, die auf die Server-IP zeigt (DNS A-Record)
- Node.js v18+ (z.B. via `nvm` oder `apt install nodejs npm`)
- SSH-Zugang zum Server

---

## Schritt 1: Projekt übertragen & starten

**Auf dem Server** (per SSH):

```bash
# Projekt per Git oder SCP übertragen
cd /var/www
git clone DEIN-REPO zubenkoai   # oder SCP vom lokalen Projekt
cd zubenkoai

npm install
cd server && npm install && cd ..
npm run seed                    # Erster Benutzer (admin / admin123)
JWT_SECRET=DEIN-GEHEIMER npm run start
```

Oder mit **PM2** für Dauerbetrieb:

```bash
npm install -g pm2
JWT_SECRET=DEIN-GEHEIMER pm2 start "npm run start" --name zubenkoai
pm2 save && pm2 startup
```

Die App läuft auf Port 3000. Nginx als Reverse-Proxy (siehe unten).

---

## Schritt 2: Nginx als Reverse-Proxy (optional)

Per SSH verbinden:

---

## Schritt 3: Nginx installieren und konfigurieren

```bash
sudo apt update
sudo apt install nginx -y
```

Nginx-Konfiguration für deine Domain erstellen:

```bash
sudo nano /etc/nginx/sites-available/zubenkoai
```

Inhalt (Domain und Pfad anpassen):

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name deine-domain.de www.deine-domain.de;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Speichern mit `Ctrl+O`, `Enter`, dann `Ctrl+X`.

Konfiguration aktivieren:

```bash
sudo ln -s /etc/nginx/sites-available/zubenkoai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Schritt 5: SSL-Zertifikat (HTTPS) mit Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d deine-domain.de -d www.deine-domain.de
```

Anweisungen im Dialog folgen (E-Mail angeben, AGB akzeptieren). Certbot richtet HTTPS ein und erneuert das Zertifikat automatisch.

---

## Schritt 6: Firewall (falls aktiv)

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## Übersicht

| Was              | Pfad / Hinweis                |
|------------------|-------------------------------|
| Projekt          | `/var/www/zubenkoai/`         |
| Datenbank        | `server/data/app.db`          |
| Nginx-Config     | `/etc/nginx/sites-available/zubenkoai` |

---

## DNS-Einrichtung

In den Einstellungen deines Domain-Anbieters:

- **A-Record**: `@` bzw. `deine-domain.de` → IP deines Servers
- **A-Record** (optional): `www` → IP deines Servers

Änderungen können einige Minuten bis Stunden dauern.

---

## Updates deployen

```bash
cd /var/www/zubenkoai
git pull
npm run build
pm2 restart zubenkoai   # falls PM2 verwendet
```

---

## Häufige Probleme

**Seite zeigt 404**  
→ Node-Server läuft? `pm2 status` oder `curl http://localhost:3000`

**Kein HTTPS**  
→ SSL mit Certbot einrichten (siehe Schritt 5).

**Fehler bei der Anmeldung**  
→ Datenbank initialisiert? `cd server && npm run seed` ausführen.
