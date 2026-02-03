# ZubenkoAI im Google Play Store veröffentlichen

Diese Anleitung erklärt, wie du die App als Android-App bauen und im Play Store veröffentlichst.

---

## Voraussetzungen

- **Android Studio** (Arctic Fox oder neuer) – [developer.android.com/studio](https://developer.android.com/studio)
- **Google Play Developer-Konto** (einmalig 25 €) – [play.google.com/console](https://play.google.com/console)
- **JDK 17** (wird mit Android Studio mitgeliefert)

---

## 1. Projekt lokal bauen

```powershell
cd c:\Users\marku\OneDrive\Desktop\AI\ai-voice-to-n8n-orchestrator
npm install
npm run android:sync
```

Das erzeugt den Web-Build und synchronisiert ihn mit dem Android-Projekt.

---

## 2. Android Studio öffnen

```powershell
npx cap open android
```

Oder: Android Studio starten → „Open“ → Ordner `android` auswählen.

---

## 3. Signing Key erstellen (für Play Store)

Im Android Studio:

1. **Build** → **Generate Signed Bundle / APK**
2. **Android App Bundle** wählen (für Play Store empfohlen)
3. **Create new...** für den Keystore:
   - Key store path: z.B. `zubenkoai.keystore`
   - Passwörter setzen und sicher aufbewahren
   - Alias: z.B. `upload`
   - Gültigkeit: mind. 25 Jahre
   - Alle Felder ausfüllen (Name, Organisation, etc.)

4. **Release** Build-Variante wählen
5. **Create** klicken

Das erzeugt eine `.aab`-Datei (Android App Bundle) im Ordner `android/app/release/`.

---

## 4. Play Console – App anlegen

1. [Play Console](https://play.google.com/console) öffnen
2. **„App erstellen“** (oder „Create app“)
3. App-Name: **ZubenkoAI**
4. Sprache: Deutsch
5. App- oder Spiel: **App**
6. Kostenlos oder kostenpflichtig: **Kostenlos**

---

## 5. Store-Listing ausfüllen

Unter **Präsentation** → **Store-Eintrag**:

| Feld | Inhalt |
|------|--------|
| **Kurzbeschreibung** (80 Zeichen) | Steuere n8n-Workflows per Sprache. Verbinde ElevenLabs mit deinem n8n-Server. |
| **Vollständige Beschreibung** | Ausführliche Beschreibung der App (z.B. aus README) |
| **App-Symbol** | 512×512 px, PNG, 32 Bit |
| **Feature-Grafik** | 1024×500 px (optional) |
| **Screenshots** | Mind. 2 Screenshots (Phone, 16:9 oder 9:16) |

---

## 6. App-Bundle hochladen

1. **Veröffentlichung** → **Produktion** (oder ** interne Tests**)
2. **Neue Version erstellen**
3. **App-Bundle hochladen** – die zuvor erstellte `.aab`-Datei auswählen
4. **Versionshinweise** eingeben (z.B. „Erste Veröffentlichung“)
5. **Zur Prüfung einreichen**

---

## 7. Datenschutz & Berechtigungen

1. **Richtlinie** → **App-Inhalt** → **Datenschutzerklärung**
   - URL zur Datenschutzerklärung (z.B. auf deiner Website) angeben
   - Falls nicht vorhanden: einfache Datenschutzerklärung erstellen und hosten

2. **Datensicherheit**-Fragebogen ausfüllen:
   - Mikrofon: Ja (für Spracherkennung)
   - Internet: Ja (für ElevenLabs und n8n)
   - Daten werden lokal/verschlüsselt gespeichert

3. **Zielgruppe** festlegen (z.B. ab 3 Jahren oder höher, je nach Inhalt)

---

## 8. Überprüfung und Veröffentlichung

- Die Prüfung kann 1–7 Tage dauern
- Bei Rückfragen wirst du per E-Mail benachrichtigt
- Nach Freigabe erscheint die App im Play Store

---

## Wichtige Hinweise

### App-ID
- Package: `de.sprachorchestrator.app`
- Diese ID sollte nach der ersten Veröffentlichung nicht mehr geändert werden.

### Keystore sichern
- Den Keystore und die Passwörter unbedingt sicher aufbewahren
- Ohne ihn kannst du keine Updates veröffentlichen

### Updates
1. `versionCode` und `versionName` in `android/app/build.gradle` erhöhen
2. `npm run android:sync` ausführen
3. Neues App-Bundle in Android Studio erzeugen
4. Neues Bundle in der Play Console hochladen

### Mindestanforderungen
- Android 7.0 (API 24) oder höher
- Mikrofon-Zugriff erforderlich
- Internetverbindung erforderlich
