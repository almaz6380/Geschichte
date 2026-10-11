# Weltgeschichte (Repo „Geschichte“)

Lern-App zur Weltgeschichte: statische PWA (ES-Module, Hash-Router, kein Build-Schritt,
kein Backend) plus Capacitor 8 für Android und iOS. App-ID `de.almaz.weltgeschichte`.
Sprache im Projekt und mit dem Nutzer: **Deutsch**. Überblick über Inhalte und Modi: `README.md`.

## Befehle

- `npm start` — lokaler Server (http://localhost:8080)
- `npm run validate` — Daten prüfen (`data/{de,en}/*.json`, gleiche IDs in beiden Sprachen)
- `npm test` — node:test (Daten, Quiz, Spielmodi, Versionsgleichheit)
- `npm run smoke` — Playwright-Durchlauf aller Routen auf DE und EN

## Architektur (kurz)

- `js/app.js` Router, `js/views/*` Bildschirme, `js/store.js` localStorage (Präfix `wg.`),
  `js/strings/{de,en}.js` Texte, `sw.js` Precache — **bei neuen Dateien `PRECACHE` ergänzen und
  `VERSION` erhöhen**.
- Spiellogik ohne DOM: `js/quiz.js`, `duel.js` (Duell per Link, Seed + Antworten im Link, kein
  Server), `hotseat.js`, `games.js`, `daily.js`, `cards.js` (Leitner); Teilen über `js/share.js`
  (`@capacitor/share` nativ). Links zeigen immer auf `WEB_URL` aus `js/version.js`.
- Inhalte: 20 Epochen, 1.040 Quizfragen (≥ 50 je Epoche, Tests erzwingen das).

## Version

Steht an vier Stellen und muss gleich sein (`test/app.test.mjs` prüft das): `package.json`,
`js/version.js`, iOS `MARKETING_VERSION` (pbxproj, 2×), `android/app/build.gradle` `versionName`.
Build-Nummern **nicht** von Hand setzen: Android `versionCode` und iOS-Build kommen aus der
Laufnummer des jeweiligen Workflows.

## Veröffentlichen

**Daueranweisung des Nutzers:** Nach jeder App-Änderung baut und veröffentlicht Claude selbst
(Android mit Upload, iOS bauen und einreichen) und meldet das Ergebnis. Anleitungen für Dinge,
die der Nutzer selbst tun muss, immer konkret Schritt für Schritt.

| Ziel | Wie |
|---|---|
| Web | `pages.yml` bei jedem Push auf `main` → https://almaz6380.github.io/Geschichte |
| Android | Workflow `android.yml` (workflow_dispatch): baut, signiert, lädt per `scripts/play-upload.py` zu Google Play (Standard: production, an alle). Eingaben `track`, `rollout`, `notes` (de-DE, ≤ 500 Zeichen), `version_code` (nur falls Play eine höhere Zahl verlangt). |
| iOS bauen | Workflow `ios.yml` (macos, fastlane): Archiv → App Store Connect/TestFlight. |
| iOS einreichen | Workflow `ios-submit.yml` + `scripts/asc-submit.py`: zuerst `nur_status`, dann `version` + `submit=true`. Nimmt den neuesten VALID-Build der Version, legt die Version an, setzt „Was ist neu“ aus `store/whatsnew-<version>.json`, weist den Build zu, reicht ein. Build muss erst von Apple verarbeitet sein (10–30 min nach dem Upload). |

Secrets (nur in GitHub, nie in den Chat): `PLAY_SERVICE_ACCOUNT_JSON` (Dienstkonto
`play-upload@wellbooked-501311…`, dasselbe wie bei mahjong-app), Upload-Keystore-Secrets,
`APPSTORE_KEY_ID`/`APPSTORE_ISSUER_ID`/`APPSTORE_PRIVATE_KEY`/`APPLE_TEAM_ID`.
App-Store-Connect-App-ID: 6811862606. Store-Texte: `docs/store-texte.md`, Einrichtung: `docs/APP-STORES.md`.

Bei neuer Version: Versionshinweise in `docs/store-texte.md` und `store/whatsnew-<version>.json`
(de-DE, en-US) anlegen und die Standard-`notes` in `android.yml` anpassen.

## Release-Stand

- **1.1.1 (11.10.2026):** Startsprache = Gerätesprache. 1.1.0 vor der Freigabe zurückgezogen
  (neu: `ios-submit.yml` Eingabe `zurueckziehen`). Android versionCode 12 in Produktion (an alle),
  iOS Build 21 eingereicht (reviewSubmission `2d556df3-…`). iOS hat 1.1.0 damit nie bekommen.
- **1.1.0 (11.10.2026):** Duelle, neue Spielmodi, 6 neue Epochen, 1.040 Fragen.
  Web live. Android versionCode 11 in Produktion (an alle), Prüfung bei Google.
  iOS Build 20 eingereicht (reviewSubmission `2c1c9dc5-…`), Veröffentlichung automatisch nach Freigabe.
- 1.0 / 1.0.0: iOS und Android (versionCode 8) live.

## Bekannt

- Startsprache (seit 11.10.2026): gespeicherte Wahl, sonst Gerätesprache (de/en), sonst
  **Englisch** (`detectLang` in `js/i18n.js`). `DEFAULT_LANG` bleibt `de` — es ist die
  Textquelle und der Rückfall für fehlende Schlüssel, nicht die Startsprache.

- Die Vercel-Integration wurde am 11.10.2026 deinstalliert. Der alte rote Status
  „Vercel – Account is blocked“ an früheren Commits ist bedeutungslos.
- `i18n/fr` ist veraltet, Französisch ist nicht freigeschaltet.
