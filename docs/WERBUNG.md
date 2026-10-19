# Werbung in Weltgeschichte

Seit 1.2.0 finanziert sich die App über Google-Werbung. Code: `js/ads.js` (alle IDs und Regeln an einer Stelle).

| Wo | Was | Regel |
|---|---|---|
| Apps | Banner unten (AdMob, adaptiv) | Nicht während Quiz, Duell, Tageschallenge, Spielen und Karten (Fehltipps neben Antwortknöpfen = ungültige Klicks) |
| Apps | Vollbild (Interstitial) | Nach einer beendeten Runde, frühestens nach der 2. Runde, dann höchstens alle 3 Minuten; vorgeladen, erscheint sofort |
| Apps | Belohntes Video | Freiwillig, 50:50-Joker im normalen Quiz (einmal pro Runde). Nicht im Duell und in der Tageschallenge, sonst wären Ergebnisse nicht vergleichbar |
| Web | AdSense-Anzeige unter dem Inhalt | Wie das Banner nicht in Spielen; neuer Block beim Seitenwechsel höchstens jede Minute |

Einwilligung: Google UMP (DSGVO-Dialog) beim Start, auf iOS zusätzlich die Tracking-Abfrage (ATT) nativ im
`AppDelegate.swift`. Ändern unter „Mehr“ → „Datenschutz bei Werbung“.

**Schalter:** `USE_TEST_ADS` in `js/ads.js`. Solange `true`, laufen Googles Testanzeigen, und in
`AndroidManifest.xml`/`Info.plist` dürfen Googles Test-App-IDs stehen. `test/ads.test.mjs` verhindert, dass
`false` mit Test-App-IDs oder leeren Anzeigenblöcken ausgeliefert wird. Echte Anzeigen nie selbst antippen
(gleiches AdMob-Konto wie Mahjong Royale, eine Sperre träfe beide Apps).

## AdMob-IDs (Konto pub-8860791993288062, eingetragen am 19.10.2026)

| | Android | iOS |
|---|---|---|
| App-ID | `ca-app-pub-8860791993288062~8295997761` | `ca-app-pub-8860791993288062~7042625840` |
| Banner („Banner“) | `…/7254378838` | `…/5729544172` |
| Interstitial („Quiz-Ende“) | `…/6712376797` | `…/9146968445` |
| Prämie („Joker“) | `…/5399295127` | `…/7043549288` |

In AdMob gibt es eine versehentlich doppelt angelegte Android-App ohne Anzeigenblöcke
(umbenannt in „NICHT VERWENDEN – doppelt“) — nicht benutzen.

## Was der Nutzer einmalig tun muss

### 1. AdMob: Apps und Anzeigenblöcke anlegen (Konto 63almaz80@gmail.com, pub-8860791993288062)

1. https://admob.google.com öffnen → links **Apps** → **App hinzufügen**.
2. Plattform **Android**, „Ist die App in einem App-Shop gelistet?“ **Ja** → nach `de.almaz.weltgeschichte` suchen → hinzufügen.
3. Die **App-ID** notieren (`ca-app-pub-8860791993288062~…`).
4. In der App: **Anzeigenblöcke** → **Anzeigenblock hinzufügen**, dreimal:
   - **Banner** – Name „Banner unten“
   - **Interstitial** – Name „Nach Runde“
   - **Prämie** (Rewarded) – Name „50:50-Joker“, Prämie: Menge 1, Artikel „Joker“
   Jede **Anzeigenblock-ID** (`ca-app-pub-8860791993288062/…`) notieren.
5. Schritte 1–4 für **iOS** wiederholen (im App Store nach „Weltgeschichte: Epochen & Quiz“ suchen, App-ID 6811862606).
6. Die 8 IDs (2 App-IDs, 6 Anzeigenblöcke) an Claude schicken. Claude trägt sie ein (`js/ads.js` `PROD`,
   `AndroidManifest.xml`, `Info.plist`), setzt `USE_TEST_ADS = false` und veröffentlicht.

### 2. AdMob: Einwilligungsnachricht (DSGVO) veröffentlichen

1. AdMob → links **Datenschutz und Mitteilungen** → **DSGVO** → **Nachricht erstellen**.
2. Apps: beide Weltgeschichte-Apps auswählen. Sprachen: Deutsch und Englisch.
3. Datenschutzerklärung: `https://almaz6380.github.io/Geschichte/datenschutz.html`.
4. **Veröffentlichen.** Ohne veröffentlichte Nachricht erscheint in der App kein Dialog und Google zeigt in der EU kaum Anzeigen.
5. Gleiches Menü → **IDFA-Erläuterung** (iOS) → Nachricht erstellen, veröffentlichen (optional, erhöht die Zustimmungsrate).

### 3. AdMob: app-ads.txt (schon erledigt)

Googles Crawler sucht `app-ads.txt` an der Wurzel der Entwickler-Website aus dem Store-Eintrag. Für
`https://almaz6380.github.io/Geschichte` ist das `https://almaz6380.github.io/app-ads.txt` – die Datei liegt dort
bereits (Repo `almaz6380.github.io`) mit `google.com, pub-8860791993288062, DIRECT, f08c47fec0942fa0`.
Nur prüfen, dass in Play („Website“ unter Store-Eintrag/Kontaktdaten) und App Store Connect („Marketing-URL“)
eine `almaz6380.github.io`-Adresse steht. AdMob zeigt „autorisiert“ etwa 24 h nach dem ersten Abruf.

### 4. Google Play Console (vor dem Upload, sonst lehnt Play das Release ab)

App „Weltgeschichte“ → links **Richtlinien und Programme** → **App-Inhalte**:

1. **Werbung** → „Enthält deine App Werbung?“ → **Ja** → Speichern.
2. **Werbe-ID** → „Verwendet deine App eine Werbe-ID?“ → **Ja** → Zwecke: **Werbung oder Marketing** → Speichern.
3. **Datensicherheit** → Bearbeiten:
   - Werden Daten erhoben? **Ja**. Verschlüsselt übertragen: **Ja**. Löschanfrage: „Nutzer können Löschung beantragen“ → **Nein** ist zulässig, da wir nichts speichern; alternativ Google-Hinweis.
   - Datentypen: **Geräte- oder andere IDs** (erhoben, geteilt, Zweck Werbung/Marketing, optional nein – erforderlich), **App-Aktivität → App-Interaktionen** (Werbung, Analysen), **Ungefährer Standort** (Werbung), **App-Informationen und -Leistung → Absturzprotokolle/Diagnose** (Analysen).
   - Wer AdMob nutzt, darf sich an Googles Vorlage halten: https://developers.google.com/admob/android/privacy/play-data-disclosure
4. **Zielgruppe und Inhalte** prüfen: Altersgruppen **nur 13 und älter** auswählen. Sind jüngere Gruppen angehakt,
   gilt die Familienrichtlinie (nur kindgerechte, nicht personalisierte Werbung) – das passt nicht zum Code.

### 5. App Store Connect

App „Weltgeschichte: Epochen & Quiz“ → **App-Datenschutz** → Bearbeiten:

1. „Erfassen Sie Daten?“ → **Ja**.
2. Datentypen: **Kennungen → Geräte-ID**, **Nutzungsdaten → Produktinteraktion** und **Werbedaten**,
   **Standort → Ungefährer Standort**, **Diagnose → Leistungsdaten**.
3. Je Typ: Zweck **Werbung durch Dritte** (bei Diagnose zusätzlich Analysen), **nicht** mit der Identität verknüpft,
   **wird zum Tracking verwendet: Ja** (bei Geräte-ID, Werbedaten, Produktinteraktion).
4. **Veröffentlichen**. Die Angaben gelten sofort und müssen vor der Einreichung von 1.2.0 stehen.

Altersfreigabe bleibt 4+.

### 6. Web: AdSense (optional, getrennt von den Apps)

AdSense prüft nur ganze Domains, hier also `almaz6380.github.io`. Das Repo dafür gibt es schon (dort liegt `app-ads.txt`).

1. Im Repo `almaz6380.github.io` eine Datei `ads.txt` mit derselben Zeile wie `app-ads.txt` anlegen
   (`google.com, pub-8860791993288062, DIRECT, f08c47fec0942fa0`). Claude legt sie an, sobald du AdSense beantragst
   (das Repo ist die gemeinsame Startseite aller Apps, deshalb nicht vorab).
2. https://adsense.google.com mit demselben Google-Konto → **Websites** → `almaz6380.github.io` hinzufügen → Bestätigung per ads.txt.
3. Auf die Freigabe warten (Tage bis Wochen; GitHub-Pages-Adressen werden nicht immer angenommen – eine eigene Domain hilft).
4. Nach der Freigabe: **Anzeigen → Nach Anzeigenblock → Displayanzeigen**, Name „Weltgeschichte unten“, horizontal → Block-ID (`data-ad-slot`) an Claude.
5. **Datenschutz und Mitteilungen** → DSGVO-Nachricht für die Website erstellen und veröffentlichen.
6. Claude trägt `ADSENSE_CLIENT` und `ADSENSE_SLOT` in `js/ads.js` ein.
