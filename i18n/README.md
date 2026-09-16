# Übersetzungs-Zwischenstände

Hier liegen die flachen Textlisten aus `scripts/i18n-extract.mjs`, aufgeteilt in Blöcke
(`<datei>.<nn>.json` mit `{ "<id>#<pfad>": "übersetzter Text" }`). Sie werden **nicht**
ausgeliefert: Die App liest ausschließlich `data/<sprache>/`.

Aus einem vollständigen Satz entsteht die Sprachfassung mit:

```bash
node scripts/i18n-apply.mjs fr i18n/fr
node scripts/validate-data.mjs
```

## Stand

| Sprache | Blöcke | Fehlt noch |
|---------|--------|-----------|
| `fr` | Epochen, Personen, Quiz, Glossar, Themen, Regionen | sämtliche Ereignisse (`events.*`) |

Solange Blöcke fehlen, darf `node scripts/i18n-apply.mjs` nicht auf `data/fr/` angewendet
werden — die unübersetzten Felder blieben sonst deutsch. Spanisch, Italienisch und
Portugiesisch sind noch nicht begonnen.
