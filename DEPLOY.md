# ZubenkoAI auf Ubuntu hochladen

## 1. Projekt auf den Server bringen

**Option A: Mit Git**
```bash
ssh user@DEINE-SERVER-IP
cd /var/www
sudo mkdir -p zubenkoai && sudo chown $USER zubenkoai
git clone https://github.com/DEIN-USER/ai-voice-to-n8n-orchestrator.git zubenkoai
cd zubenkoai
```

**Option B: Mit SCP (von Windows)**
```powershell
# Zuerst auf dem Server: mkdir -p /var/www/zubenkoai
scp -r "C:\Users\marku\OneDrive\Desktop\AI\ai-voice-to-n8n-orchestrator\*" user@DEINE-SERVER-IP:/var/www/zubenkoai/
```
Ersetze `user` und `DEINE-SERVER-IP`. Dann per SSH: `cd /var/www/zubenkoai`.

---

## 2. Auf dem Server installieren & starten

**Mit Skript (empfohlen):**
```bash
chmod +x deploy.sh
./deploy.sh DEIN-SICHERES-GEHEIMES
JWT_SECRET=DEIN-SICHERES-GEHEIMES npm run start
```
(Danach für PM2: `npm run serve` nutzen)

**Manuell:**
```bash
# Node.js prüfen (mind. v18)
node -v   # Falls nicht: sudo apt install nodejs npm

cd /var/www/zubenkoai

# Abhängigkeiten
npm install
cd server && npm install && cd ..

# Ersten Benutzer anlegen (admin / admin123)
cd server && npm run seed && cd ..

# Starten (ersetze DEIN-SICHERES-GEHEIMES durch einen zufälligen String)
JWT_SECRET=DEIN-SICHERES-GEHEIMES npm run start
```

App läuft auf **http://localhost:3000**.

---

## 3. Dauerhaft laufen lassen (PM2)

```bash
sudo npm install -g pm2
cd /var/www/zubenkoai
JWT_SECRET=DEIN-SICHERES-GEHEIMES pm2 start "npm run serve" --name zubenkoai
pm2 save
pm2 startup   # Anweisungen für Autostart befolgen
```

---

## 4. Nginx + HTTPS (für Domain)

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
sudo nano /etc/nginx/sites-available/zubenkoai
```

Einfügen (Domain anpassen):
```nginx
server {
    listen 80;
    server_name deine-domain.de;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktivieren:
```bash
sudo ln -s /etc/nginx/sites-available/zubenkoai /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d deine-domain.de
```

---

## 4b. Docker + Traefik (statt Nginx)

Wenn du bereits n8n mit Docker und Traefik betreibst, kannst du ZubenkoAI daneben laufen lassen.

### Option A: In bestehende compose.yaml einbinden

Füge den `zubenkoai`-Service zu deiner `~/n8n-compose/compose.yaml` hinzu. ZubenkoAI nutzt dieselbe `.env` (DOMAIN_NAME, SSL_EMAIL etc.) wie n8n.

**1. ZubenkoAI-Projekt neben n8n-compose ablegen:**
```bash
cd ~/n8n-compose
git clone https://github.com/DEIN-USER/ai-voice-to-n8n-orchestrator.git zubenkoai
```

**2. In `compose.yaml` den Service ergänzen:**

- `zubenkoai` als neuen Service **unter** `n8n:` einfügen (gleiche Einrückung wie `n8n`)
- Im bestehenden `volumes:`-Block nur `zubenkoai-data:` hinzufügen – **kein zweites** `volumes:` anlegen

Wichtig: In YAML muss die Einrückung mit **Leerzeichen** (nicht Tabs) erfolgen. Es darf nur **einen** `volumes:`-Block am Ende geben.

Vollständiges Beispiel siehe `docs/compose-beispiel.yaml`.

**3. In `.env` ergänzen:**
```
JWT_SECRET=dein-sicheres-geheimnis
```

**4. Starten:**
```bash
cd ~/n8n-compose
docker compose up -d --build
docker compose exec zubenkoai node scripts/seed.js
```

ZubenkoAI ist dann unter **https://zubenkoai.DEINE-DOMAIN** erreichbar (ersetze DEINE-DOMAIN durch deinen DOMAIN_NAME).

---

### Option B: Eigenständiges docker-compose

Wenn ZubenkoAI in einem eigenen Ordner liegt (z.B. `/var/www/zubenkoai`):

**1. Netzwerk prüfen** (Name kann je nach Ordnername abweichen):
```bash
docker network ls | grep n8n
```

Falls das Netzwerk z.B. `n8ncompose_default` heißt, in `docker-compose.standalone.yml` anpassen.

**2. `.env` anlegen** (im ZubenkoAI-Ordner):
```
JWT_SECRET=dein-sicheres-geheimnis
DOMAIN_NAME=deine-domain.de
```

**3. Starten:**
```bash
cd /var/www/zubenkoai
docker compose -f docker-compose.standalone.yml up -d --build
docker compose -f docker-compose.standalone.yml exec zubenkoai node scripts/seed.js
```

---

### 1. Projekt hochladen (allgemein)

```bash
cd /var/www
git clone https://github.com/DEIN-USER/ai-voice-to-n8n-orchestrator.git zubenkoai
cd zubenkoai
```

Oder per SCP (wie in Abschnitt 1).

### 2. Traefik-Labels anpassen

Öffne `docker-compose.yml` und passe die Domain an:

```yaml
# Ersetze zubenkoai.deine-domain.de durch deine echte Domain
- "traefik.http.routers.zubenkoai.rule=Host(`zubenkoai.deine-domain.de`)"
- "traefik.http.routers.zubenkoai-http.rule=Host(`zubenkoai.deine-domain.de`)"
```

Falls dein Traefik andere Namen nutzt, passe an:
- `websecure` → z.B. `https` (Entrypoint für HTTPS)
- `web` → z.B. `http` (Entrypoint für HTTP)
- `letsencrypt` → z.B. `le` (Cert-Resolver)
- `traefik` → Name des Traefik-Docker-Netzwerks (wie bei n8n)

### 3. Starten

```bash
cd /var/www/zubenkoai

# JWT-Geheimnis setzen (wichtig für Produktion)
export JWT_SECRET=DEIN-SICHERES-GEHEIMES

# Bauen und starten
docker compose up -d --build

# Ersten Benutzer anlegen (admin / admin123)
docker compose exec zubenkoai node scripts/seed.js
```

### 4. Benutzer-Konfiguration setzen

```bash
docker compose exec -e ELEVEN_LABS_KEY=xi-... -e ELEVEN_LABS_AGENT_ID=... -e N8N_WEBHOOK_URL=https://... zubenkoai node scripts/set-config.js admin
```

### 5. Logs und Neustart

```bash
docker compose logs -f zubenkoai   # Logs anzeigen
docker compose restart zubenkoai   # Neustart
docker compose down && docker compose up -d --build   # Neu bauen
```

### Datenbank-Persistenz

Die SQLite-Datenbank liegt im Docker-Volume `zubenkoai-data` und bleibt bei Updates erhalten.

---

## 5. Einstellungen für Benutzer setzen

```bash
cd /var/www/zubenkoai/server
ELEVEN_LABS_KEY=xi-... ELEVEN_LABS_AGENT_ID=... N8N_WEBHOOK_URL=https://... npm run set-config -- admin
```

---

## Schnell-Übersicht

| Variante | Befehl |
|----------|--------|
| **Ohne Docker** | |
| Hochladen | `scp -r projekt/* user@IP:/var/www/zubenkoai/` |
| Install | `npm install && cd server && npm install` |
| Benutzer | `cd server && npm run seed` |
| Start | `JWT_SECRET=xxx npm run start` |
| Dauerhaft | `pm2 start "npm run serve" --name zubenkoai` |
| **Docker + Traefik** | |
| Start | `docker compose up -d --build` |
| Benutzer | `docker compose exec zubenkoai node scripts/seed.js` |
| Logs | `docker compose logs -f zubenkoai` |
