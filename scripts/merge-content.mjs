// Führt Epochen-Dateien aus einem Ordner zu data/de/*.json zusammen (deutsche Referenz).
//   <slug>.json      Basis: { epoch, events, persons, quiz, glossary? }
//   <slug>.add.json  Ergänzung: { epoch? (Zusatzfelder), events, persons, quiz, glossary }
//   themes.json      Querschnittsthemen (wird 1:1 nach data/de/themes.json übernommen)
// Aufruf: node scripts/merge-content.mjs <ordner-mit-epochen-json>
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src) {
  console.error('Bitte Quellordner angeben.');
  process.exit(1);
}

const epochs = new Map();
const events = [];
const persons = [];
const quiz = [];
const glossary = [];

const files = readdirSync(src).filter((n) => n.endsWith('.json') && n !== 'themes.json' && !n.startsWith('EXISTING')).sort();
const base = files.filter((n) => !n.endsWith('.add.json'));
const adds = files.filter((n) => n.endsWith('.add.json'));

for (const f of base) {
  const chunk = JSON.parse(readFileSync(path.join(src, f), 'utf8'));
  if (!chunk.epoch) continue;
  epochs.set(chunk.epoch.id, { ...chunk.epoch });
  events.push(...(chunk.events || []));
  persons.push(...(chunk.persons || []));
  quiz.push(...(chunk.quiz || []));
  glossary.push(...(chunk.glossary || []));
}

for (const f of adds) {
  const slug = f.replace(/\.add\.json$/, '');
  const chunk = JSON.parse(readFileSync(path.join(src, f), 'utf8'));
  const target = epochs.get(slug) || (chunk.epoch?.id && epochs.get(chunk.epoch.id));
  if (!target) {
    console.warn(`Warnung: keine Basis-Epoche für ${f}`);
  } else if (chunk.epoch) {
    for (const [k, v] of Object.entries(chunk.epoch)) {
      if (k === 'id') continue;
      if (Array.isArray(v) && Array.isArray(target[k]) && !['keyFacts', 'sections'].includes(k)) target[k] = [...target[k], ...v];
      else target[k] = v;
    }
  }
  events.push(...(chunk.events || []));
  persons.push(...(chunk.persons || []));
  quiz.push(...(chunk.quiz || []));
  glossary.push(...(chunk.glossary || []));
}

const epochList = [...epochs.values()].sort((a, b) => a.order - b.order);
events.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title, 'de'));
quiz.sort((a, b) => a.epochId.localeCompare(b.epochId) || a.id.localeCompare(b.id));
glossary.sort((a, b) => a.term.localeCompare(b.term, 'de'));

const out = (name, data) =>
  writeFileSync(path.join(ROOT, 'data', 'de', name), JSON.stringify(data, null, 2) + '\n');
out('epochs.json', epochList);
out('events.json', events);
out('persons.json', persons);
out('quiz.json', quiz);
out('glossary.json', glossary);

let themesCount = 0;
const themesPath = path.join(src, 'themes.json');
if (existsSync(themesPath)) {
  const themes = JSON.parse(readFileSync(themesPath, 'utf8'));
  out('themes.json', themes);
  themesCount = themes.length;
}

console.log(`Zusammengeführt: ${epochList.length} Epochen, ${events.length} Ereignisse, ${persons.length} Personen, ${quiz.length} Fragen, ${glossary.length} Begriffe, ${themesCount} Themen.`);
