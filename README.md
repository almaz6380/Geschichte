# Weltgeschichte – Geschichts-App (PWA)

Eine Lern-App, die alle wesentlichen Themen der Vergangenheit abdeckt: von der Urgeschichte bis zur Gegenwart, auf allen Kontinenten. Sie läuft als Web-App im Browser und lässt sich auf iPhone und Android als App auf dem Startbildschirm installieren (Progressive Web App). Nach dem ersten Aufruf funktioniert sie auch offline.

## Gliederung der Inhalte

Die Inhalte sind entlang von drei Achsen geordnet, die überall miteinander verlinkt sind:

| Achse | Was sie bietet |
|-------|----------------|
| **Epochen** (14) | Chronologisch von der Steinzeit bis heute. Jede Epoche hat „Auf einen Blick“, Überblick, vier Themenabschnitte (Herrschaft und Politik · Gesellschaft und Alltag · Kultur, Religion und Wissen · Wirtschaft und Technik), Schlüsselereignisse nach Jahrhunderten, Personen, Begriffe und Folgen. |
| **Querschnittsthemen** (8) | Rote Linien durch alle Epochen: Religionen, Wissenschaft und Technik, Krieg und Frieden, Handel und Globalisierung, Herrschaft und Demokratie, Frauen in der Geschichte, Migration, Kunst und Bildung. |
| **Regionen** (7) | Geschichte nach Kontinenten mit Ereignissen je Epoche und Personen. |

Dazu kommen die **Zeitleiste** (alle Ereignisse, filterbar nach Epoche, Region, Thema und Meilensteinen), das **Glossar** (alphabetisch, mit Verweisen auf Ereignisse und Personen), das **Quiz** (10 Fragen pro Epoche oder 20 gemischt, mit Erklärungen und Bestwerten), die **Volltextsuche** über alle Inhaltsarten und **Lesezeichen**.

## Funktionen

- Helles und dunkles Farbschema, mobile Navigation mit „Mehr“-Bereich, Desktop-Layout mit festem Inhaltsverzeichnis
- Installierbar als App (Manifest, Icons, Service Worker), Update-Hinweis bei neuer Version
- Tastatur- und Screenreader-freundlich, keine externen Abhängigkeiten, kein Tracking

## Lokal starten

Es gibt keinen Build-Schritt und keine Abhängigkeiten. Ein statischer Webserver genügt:

```bash
npm start            # entspricht: python3 -m http.server 8080
# dann http://localhost:8080/ öffnen
```

## Veröffentlichen (GitHub Pages)

Der Workflow `.github/workflows/pages.yml` veröffentlicht bei jedem Push auf `main` automatisch nach GitHub Pages. Dafür einmalig in den Repository-Einstellungen unter **Pages** als Quelle **GitHub Actions** wählen. Alle Pfade sind relativ, das Routing läuft über `#/…`, daher ist keine weitere Konfiguration nötig.

Bei Änderungen an App-Dateien die Konstante `VERSION` in `sw.js` erhöhen, damit installierte Apps die neue Version laden.

## Inhalte pflegen

Die Inhalte liegen als JSON in `data/`:

| Datei | Inhalt |
|-------|--------|
| `regions.json` | Regionen (id, name, color) |
| `epochs.json` | Epochen mit Überblick, keyFacts, sections, consequences |
| `events.json` | Ereignisse (Jahr, Region, Text, Personen, Bedeutung 1–3) |
| `persons.json` | Personen |
| `quiz.json` | Quizfragen mit vier Antworten, Erklärung und Schwierigkeit |
| `glossary.json` | Begriffe mit Definition, Epoche und Verweisen |
| `themes.json` | Querschnittsthemen mit Ereignis-, Personen- und Begriffs-IDs |

Jahreszahlen sind ganze Zahlen, negative Werte bedeuten v. Chr. Nach Änderungen:

```bash
npm run validate     # prüft Schema, IDs, Referenzen und Mindestmengen
npm test             # Node-Tests für Daten, Suche und Quiz-Logik
```

Inhalte lassen sich auch als einzelne Epochen-Dateien (`<slug>.json` plus Ergänzung `<slug>.add.json`, jeweils `{ epoch, events, persons, quiz, glossary }`) pflegen und mit `node scripts/merge-content.mjs <ordner>` zu den Dateien in `data/` zusammenführen.

## Native Apps für iOS und Android (App Store, Google Play)

Die Web-App ist mit **Capacitor** als native App verpackt; die Projekte liegen in `ios/` und `android/`. Alle Inhalte sind in der App enthalten, sie braucht keinen Server.

```bash
npm install
npm run cap:sync      # Web-App nach www/ kopieren und in beide Projekte einspielen
npm run ios           # öffnet Xcode (Mac)
npm run android       # öffnet Android Studio
```

Bundle-ID `de.almaz.weltgeschichte`, Version in `package.json`, `js/version.js`, Xcode (`MARKETING_VERSION`) und `android/app/build.gradle`. Icons und Startbildschirme werden aus `assets/` mit `npm run assets` erzeugt (Vorlagen mit `node scripts/make-store-assets.mjs`).

Die Apps werden per GitHub Actions in der Cloud gebaut (`.github/workflows/ios.yml`, `android.yml`), ganz ohne eigenen Mac: iOS wird automatisch nach App Store Connect hochgeladen, für Android entsteht das App-Bundle als Download. Die vollständige Anleitung für den Browser-Weg steht in **[docs/APP-STORES.md](docs/APP-STORES.md)**, Store-Texte in [docs/store-texte.md](docs/store-texte.md), fertige Screenshots in `docs/screenshots/` (`node scripts/make-screenshots.mjs`). Die Datenschutzerklärung liegt unter `datenschutz.html`.

## Browser-Test

```bash
npm run smoke        # Playwright-Smoke-Test mit Chromium, Screenshots in .playwright-out/
npm run icons        # erzeugt PNG-Icons aus icons/icon.svg
```

Der Workflow `.github/workflows/ci.yml` führt Validierung und Tests bei jedem Push und Pull Request aus.

## Projektstruktur

```
index.html            App-Shell mit Navigation
manifest.webmanifest  PWA-Manifest
sw.js                 Service Worker (Offline-Cache)
css/                  Styles (Basis, Komponenten, Zeitleiste, Quiz)
js/                   Router, Store, Daten-Indizes, Suche, Quiz-Logik
js/views/             Startseite, Epochen, Ereignis, Person, Zeitleiste, Themen, Glossar,
                      Regionen, Quiz, Suche, Lesezeichen, Mehr
data/                 Inhalte als JSON
icons/                App-Icons
scripts/              Validierung, Merge, Icons, Smoke-Test
test/                 Node-Tests
.github/workflows/    CI und GitHub-Pages-Deployment
```
