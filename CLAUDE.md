# Weltgeschichte (Repo „Geschichte“)

Lern-App zur Weltgeschichte: statische PWA (ES-Module, Hash-Router, kein Build-Schritt,
kein Backend) plus Capacitor 8 für Android und iOS. App-ID `de.almaz.weltgeschichte`.
Sprache im Projekt und mit dem Nutzer: **Deutsch**. Überblick über Inhalte und Modi: `README.md`.

## Befehle

- `npm start` — lokaler Server (http://localhost:8080)
- `npm run validate` — Daten prüfen (`data/<sprache>/*.json`, gleiche IDs in allen Sprachen)
- `npm test` — node:test (Daten, Quiz, Spielmodi, Versionsgleichheit)
- `npm run smoke` — Playwright-Durchlauf aller Routen auf DE und EN

## Architektur (kurz)

- `js/app.js` Router, `js/views/*` Bildschirme, `js/store.js` localStorage (Präfix `wg.`),
  `js/strings/<sprache>.js` Texte, `sw.js` Precache — **bei neuen Dateien `PRECACHE` ergänzen und
  `VERSION` erhöhen**.
- Spiellogik ohne DOM: `js/quiz.js`, `duel.js` (Duell per Link, Seed + Antworten im Link, kein
  Server), `hotseat.js`, `games.js`, `daily.js`, `cards.js` (Leitner); Teilen über `js/share.js`
  (`@capacitor/share` nativ). Links zeigen immer auf `WEB_URL` aus `js/version.js`.
- Werbung: `js/ads.js` (AdMob über `window.Capacitor.Plugins.AdMob`, AdSense im Web), Regeln und
  Einrichtung in `docs/WERBUNG.md`. `USE_TEST_ADS` erst auf `false`, wenn echte IDs in `js/ads.js`,
  `AndroidManifest.xml` und `Info.plist` stehen (`test/ads.test.mjs` prüft das).
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

- **1.2.0 (in Arbeit, Branch `claude/werbung`):** 9 Sprachen, Werbung (Banner, Vollbild nach Runden, Video für den
  50:50-Joker), DSGVO-Einwilligung, iOS-Tracking-Abfrage, Datenschutzerklärung und Store-Texte angepasst.
  AdMob-IDs eingetragen (19.10.2026). Wartet auf die Angaben in Play Console/App Store Connect (`docs/WERBUNG.md`).
  **⚠ VOR dem Einreichen von 1.2.0:** Startbild (Splash) mit dem **WellApps-Logo** des Nutzers ersetzen
  (Wunsch vom 19.10.2026). Logo-Datei liegt noch nicht im Repo — beim Nutzer anfragen; danach
  `assets/splash*` neu und `npm run assets` (capacitor-assets) für iOS und Android.
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
- **9 Sprachen** (seit 1.2.0): de, en, fr, es, it, pt (pt-BR), ru, ja, zh (Kurzzeichen). Inhalte wurden aus
  `data/en` übersetzt: `translate/src` (Vorlage in Blöcken), `translate/<sprache>/` (Übersetzung),
  `node translate/check.mjs <sprache>` und `node translate/lint.mjs <sprache>` prüfen, dann
  `node scripts/i18n-apply.mjs <sprache> translate/<sprache>`. **Ändert sich ein deutscher/englischer Text,
  muss er in allen Sprachen nachgezogen werden** (Block neu extrahieren und übersetzen).
  Store-Texte je Sprache: `store/store-texte.json` (aus `translate/store-<sprache>.json` per
  `python3 translate/merge-store.py`, das auch App-Namen in iOS-`*.lproj` und Android-`values-*` schreibt).
  Pluralformen über `Intl.PluralRules` (Russisch: *.one/*.few/*.other). Suche versteht Kyrillisch und CJK.
- Store-Sprachen, Screenshots je Sprache, Standardsprache en-US und alle Länder (Apple): Workflow
  `store-sprachen.yml` (`scripts/asc-store.py`, `scripts/play-upload.py --store-sprachen`). Bei Google Play
  lassen sich Länder nicht per API freischalten (Play Console → Produktion → Länder/Regionen).
