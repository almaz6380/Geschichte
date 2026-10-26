# Auftrag: Oberfläche und Store-Texte einer neuen Sprache

Arbeitsverzeichnis /home/user/Geschichte. Nur die zwei unten genannten Dateien anlegen, nichts committen.
Zwischendateien nur in einem eigenen Unterordner von
/tmp/claude-0/-home-user/7011d567-98c6-5fdb-b53d-bdaa96fb1bc8/scratchpad/ (Name mit Sprachkürzel + Zufallszahl).

## 1. js/strings/<sprache>.js
- Vorlage: js/strings/en.js (gleicher Aufbau, gleiche Schlüssel, gleiche Platzhalter wie {n}, {name} usw. –
  Platzhalter NIE übersetzen). Sieh dir js/strings/ru.js an: Dort gibt es zusätzliche Pluralformen
  (`*.few`, `*.many`) für Sprachen mit mehr als zwei Formen. Die App nimmt Intl.PluralRules der Sprache
  (siehe plural() in js/i18n.js). Lege für jeden Schlüssel, der in en.js mit `.one`/`.other` vorkommt, alle
  Formen an, die die Sprache laut Intl.PluralRules braucht (Polnisch: one, few, many, other; Koreanisch,
  Indonesisch: nur other – .one trotzdem mit derselben Form anlegen; Türkisch, Niederländisch: one, other).
- Exportname wie in den anderen Dateien (z. B. `export default {...}` oder benannter Export – exakt übernehmen).
- Kurz, natürlich, wie in einer guten App. Knöpfe knapp. Fachbegriffe passend zu den Inhaltsübersetzungen
  in translate/<sprache>/ (z. B. Epochen-/Quiz-Begriffe; schau mit grep nach, was dort gewählt wurde).
- Prüfen: `node -e "import('./js/strings/<sprache>.js').then(m=>console.log(Object.keys(m.default||m).length))"`
  und Schlüssel mit en.js vergleichen (alle en-Schlüssel müssen vorhanden sein).

## 2. translate/store-<sprache>.json
- Vorlage: translate/store-es.json (gleiche Schlüssel) und die deutsche/englische Fassung in
  store/store-texte.json („de-DE“, „en-US“) – Inhalt aus der englischen Fassung übertragen.
- Grenzen: name ≤ 30, subtitle ≤ 30, play_title ≤ 30, short ≤ 80, promo ≤ 170, keywords ≤ 100 Zeichen
  (kommagetrennt, ohne Leerzeichen nach dem Komma, keine Wörter, die schon im Namen stehen),
  description ≤ 4000. In der Beschreibung die Sprachliste um die neue Sprache erweitern: Die App gibt es
  dann in 15 Sprachen: Englisch, Deutsch, Französisch, Spanisch, Italienisch, Portugiesisch, Russisch,
  Japanisch, Chinesisch, Koreanisch, Türkisch, Polnisch, Niederländisch, Indonesisch, Arabisch.
- whatsnew: „<App> gibt es jetzt auf <Sprache>.“ + 1 Satz zu den 25 Epochen (≤ 400 Zeichen).
- display_name: kurzer App-Name für den Homescreen (≤ 12 Zeichen).
- att: Text der iOS-Tracking-Abfrage, sinngemäß wie in store-es.json.
- feature: title/line1/line2 wie in store-es.json.
- Gültiges JSON, Längen mit einem Skript prüfen.

Am Ende knapp melden.
