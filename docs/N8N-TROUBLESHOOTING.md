# n8n-Webhook: Fehlerbehebung

Wenn du "Verbindung zum n8n-Workflow fehlgeschlagen" siehst, prüfe Folgendes:

---

## 1. Konfiguration prüfen

Die App braucht eine **n8n Webhook-URL** pro Benutzer. Prüfe in der Admin-Seite (Benutzer → Konfiguration):

- **n8n Webhook-URL** muss gesetzt sein
- Format: `https://n8n.DEINE-DOMAIN/webhook/DEIN-WEBHOOK-PFAD`

**Beispiel:**
```
https://n8n.zubenko.de/webhook/voice-orchestrator
```

---

## 2. n8n Workflow einrichten

In n8n brauchst du einen Workflow mit einem **Webhook-Node**:

1. Neuen Workflow anlegen
2. **Webhook**-Node hinzufügen (Trigger)
3. **Webhook URLs** → **Production URL** kopieren
4. Diese URL in die ZubenkoAI-Benutzerkonfiguration eintragen
5. Workflow **aktivieren** (oben rechts auf "Inaktiv" klicken)

**Wichtig:** Der Workflow muss **aktiv** sein, sonst antwortet der Webhook nicht.

---

## 3. Webhook-Payload

Die App sendet folgende JSON-Daten:

```json
{
  "message": "Deine Nachricht oder Spracheingabe",
  "timestamp": "2026-02-04T12:00:00.000Z",
  "source": "voice-orchestrator-app"
}
```

Im n8n-Webhook-Node: **HTTP Method** = POST, **Path** frei wählbar.

---

## 4. CORS (wichtig bei verschiedenen Domains)

Wenn ZubenkoAI unter `zubenkoai.zubenko.de` und n8n unter `n8n.zubenko.de` läuft, blockiert der Browser evtl. die Anfrage (CORS).

**Lösung:** In n8n die Umgebungsvariable setzen:

```bash
# In docker-compose oder .env für n8n:
N8N_CORS_ORIGIN=https://zubenkoai.zubenko.de
# oder mehrere Domains:
N8N_CORS_ORIGIN=https://zubenkoai.zubenko.de,https://zubenko.de
```

Falls n8n in Docker läuft, `docker-compose` anpassen:

```yaml
environment:
  - N8N_CORS_ORIGIN=https://zubenkoai.zubenko.de
```

Danach n8n neu starten.

---

## 5. API-Key (falls n8n geschützt)

Wenn n8n einen API-Key verlangt, musst du ihn in der Benutzerkonfiguration unter **n8n API-Key** eintragen. Die App sendet ihn als Header `X-N8N-API-KEY`.

---

## 6. Browser-Konsole prüfen

Öffne die **Entwicklertools** (F12) → **Konsole**. Dort siehst du den genauen Fehler:

- **CORS** → "blocked by CORS policy"
- **404** → Webhook-URL falsch oder Workflow nicht aktiv
- **401/403** → API-Key fehlt oder falsch
- **Net::ERR_NAME_NOT_RESOLVED** → Domain/DNS-Problem
- **net::ERR_CONNECTION_REFUSED** → n8n nicht erreichbar

---

## 7. Manueller Test mit curl

Teste den Webhook direkt vom Server:

```bash
curl -X POST "https://n8n.DEINE-DOMAIN/webhook/DEIN-PFAD" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test","timestamp":"2026-02-04T12:00:00Z","source":"test"}'
```

Wenn das funktioniert, liegt das Problem sehr wahrscheinlich an CORS im Browser.

---

## Checkliste

| Punkt | Erledigt |
|-------|----------|
| n8n Webhook-URL in Benutzerkonfiguration eingetragen | ☐ |
| n8n Workflow mit Webhook-Node erstellt | ☐ |
| Workflow **aktiviert** | ☐ |
| N8N_CORS_ORIGIN für ZubenkoAI-Domain gesetzt | ☐ |
| API-Key gesetzt (falls n8n geschützt) | ☐ |
