# Auftrag für Übersetzer-Agenten

Arbeitsverzeichnis: /home/user/Geschichte (nur in `translate/<sprache>/` schreiben, sonst nichts ändern, nichts committen).

Schleife, bis `FERTIG` kommt:
1. `node translate/next.mjs <sprache>` gibt den nächsten offenen Block aus (z. B. `events.51.json`) und reserviert ihn.
2. Lies `translate/src/<block>` (englische Vorlage: `{ "<id>#<pfad>": "Text" }`).
3. Schreibe `translate/<sprache>/<block>` mit GENAU denselben Schlüsseln, jeder Wert übersetzt.
   Schreibe in Teilen, falls der Block groß ist (z. B. per Node-Skript, das mehrere Teil-Objekte zusammenführt),
   aber am Ende muss eine gültige JSON-Datei mit allen Schlüsseln stehen.
4. Prüfe: `node translate/check.mjs <sprache> <block>` und `node translate/lint.mjs <sprache>` – Fehler beheben.
5. Weiter mit Schritt 1.

Zwischendateien NUR in einem eigenen Unterordner ablegen: /tmp/claude-0/-home-user/7011d567-98c6-5fdb-b53d-bdaa96fb1bc8/scratchpad/tr-<sprache>-<zufallszahl>/ (andere Agenten arbeiten parallel; nie gemeinsame Dateinamen im Scratchpad benutzen).

Regeln:
- Sprachregeln in `translate/rules/<sprache>.md` beachten.
- Einheitliche Begriffe: Für Namen, Epochentitel, Orte und Fachbegriffe, die es schon gibt, die bestehende
  Übersetzung aus `translate/<sprache>/*.json` übernehmen (mit grep suchen, z. B. nach „justinian“, „konstantinopel“,
  „Kiewer“, „angkor“, „lindisfarne“, „cook“). Gibt es noch keine Übersetzung in deiner Sprache, sorgfältig festlegen und dann einheitlich verwenden. Epochentitel stehen in `translate/<sprache>/epochs.*.json` unter `<id>#title`.
- Natürlich und flüssig für Lernende, sachlich, keine Zusätze, keine Auslassungen, Zahlen und Jahre unverändert.
- Quiz: Die vier Antworten (`#choices.0`–`.3`) müssen verschieden bleiben; Erklärung muss zur Lösung passen.
- Tags (`#tags.n`) kurz, klein geschrieben wo in der Sprache üblich.
- Keine Platzhalter, kein Englisch stehen lassen (außer Eigennamen).

Am Ende knapp melden, welche Blöcke du erledigt hast.
