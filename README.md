# Weltgeschichte – Geschichts-App (PWA)

Eine Geschichts-App, die alle wesentlichen Themen der Vergangenheit abdeckt: von der Urgeschichte bis zur Gegenwart, alle Kontinente. Sie läuft als Web-App im Browser und lässt sich auf iPhone und Android als App auf dem Startbildschirm installieren (Progressive Web App). Nach dem ersten Aufruf funktioniert sie auch offline.

## Funktionen

- **14 Epochen** mit Überblick, Schlüsselereignissen, wichtigen Personen und Folgen
- **Interaktive Zeitleiste** aller Ereignisse, filterbar nach Epoche und Region, mit Deep-Links
- **Quiz** pro Epoche und als gemischtes Quiz mit Auswertung und gespeicherten Bestwerten
- **Volltextsuche** über Epochen, Ereignisse und Personen (umlaut-tolerant)
- **Lesezeichen** für Epochen, Ereignisse und Personen (lokal im Browser)
- Helles und dunkles Farbschema, mobile Navigation, Tastatur- und Screenreader-freundlich

## Lokal starten

Es gibt keinen Build-Schritt und keine Abhängigkeiten. Ein statischer Webserver genügt:

```bash
npm start            # entspricht: python3 -m http.server 8080
# dann http://localhost:8080/ öffnen
```

## Veröffentlichen (GitHub Pages)

Repository-Einstellungen → Pages → Branch auswählen, Ordner `/ (root)`. Alle Pfade sind relativ, Routing läuft über `#/…`, daher ist keine weitere Konfiguration nötig.

Bei jeder Änderung an App-Dateien die Konstante `VERSION` in `sw.js` erhöhen, damit installierte Apps die neue Version laden.

## Inhalte erweitern

Die Inhalte liegen als JSON in `data/`:

| Datei | Inhalt |
|-------|--------|
| `regions.json` | Regionen (id, name, color) |
| `epochs.json` | Epochen mit Artikeltexten |
| `events.json` | Ereignisse (Jahr, Region, Text, Personen, Bedeutung) |
| `persons.json` | Personen |
| `quiz.json` | Quizfragen mit vier Antworten und Erklärung |

Jahreszahlen sind ganze Zahlen, negative Werte bedeuten v. Chr. Nach Änderungen:

```bash
npm run validate     # prüft Schema, IDs, Referenzen und Mindestmengen
npm test             # Node-Tests für Daten, Suche und Quiz-Logik
```

Alternativ können Epochen als einzelne Dateien (`{ epoch, events, persons, quiz }`) gepflegt und mit `node scripts/merge-content.mjs <ordner>` zusammengeführt werden.

## Browser-Test

```bash
npm run smoke        # Playwright-Smoke-Test mit Chromium, Screenshots in .playwright-out/
npm run icons        # erzeugt PNG-Icons aus icons/icon.svg
```

## Projektstruktur

```
index.html            App-Shell
manifest.webmanifest  PWA-Manifest
sw.js                 Service Worker (Offline-Cache)
css/                  Styles (Basis, Komponenten, Zeitleiste, Quiz)
js/                   Router, Store, Daten, Suche, Quiz-Logik, Views
data/                 Inhalte als JSON
icons/                App-Icons
scripts/              Validierung, Merge, Icons, Smoke-Test
test/                 Node-Tests
```
