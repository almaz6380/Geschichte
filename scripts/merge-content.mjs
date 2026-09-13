// Führt Epochen-Dateien (je { epoch, events, persons, quiz }) aus einem Ordner
// zu data/epochs.json, events.json, persons.json und quiz.json zusammen.
// Aufruf: node scripts/merge-content.mjs <ordner-mit-epochen-json>
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src) {
  console.error('Bitte Quellordner angeben.');
  process.exit(1);
}

const epochs = [];
const events = [];
const persons = [];
const quiz = [];

for (const f of readdirSync(src).filter((n) => n.endsWith('.json')).sort()) {
  const chunk = JSON.parse(readFileSync(path.join(src, f), 'utf8'));
  if (!chunk.epoch) continue;
  epochs.push(chunk.epoch);
  events.push(...(chunk.events || []));
  persons.push(...(chunk.persons || []));
  quiz.push(...(chunk.quiz || []));
}

epochs.sort((a, b) => a.order - b.order);
events.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title, 'de'));

const out = (name, data) =>
  writeFileSync(path.join(ROOT, 'data', name), JSON.stringify(data, null, 2) + '\n');
out('epochs.json', epochs);
out('events.json', events);
out('persons.json', persons);
out('quiz.json', quiz);
console.log(`Zusammengeführt: ${epochs.length} Epochen, ${events.length} Ereignisse, ${persons.length} Personen, ${quiz.length} Fragen.`);
