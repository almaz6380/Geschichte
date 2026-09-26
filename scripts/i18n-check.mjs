// Prüft übersetzte Blöcke gegen die Quellblöcke: gültiges JSON, gleiche Schlüssel,
// keine leeren Werte, und wie viele Werte unverändert aus der Quelle stammen.
//
//   node scripts/i18n-check.mjs <übersetzungsordner> [quellordner] [block …]
//
// Beispiel: node scripts/i18n-check.mjs i18n/es translate/source-en events.01 events.02
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const [dir, src = 'translate/source-en', ...only] = process.argv.slice(2);
if (!dir) { console.error('Aufruf: node scripts/i18n-check.mjs <übersetzungsordner> [quellordner] [block …]'); process.exit(1); }

const blocks = readdirSync(src).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
  .filter((b) => !only.length || only.includes(b)).sort();
let problems = 0;
for (const b of blocks) {
  const source = JSON.parse(readFileSync(path.join(src, `${b}.json`), 'utf8'));
  const file = path.join(dir, `${b}.json`);
  if (!existsSync(file)) { console.log(`${b}: FEHLT`); problems++; continue; }
  let t;
  try { t = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.log(`${b}: UNGÜLTIGES JSON (${e.message})`); problems++; continue; }
  const missing = Object.keys(source).filter((k) => typeof t[k] !== 'string' || !t[k].trim());
  const extra = Object.keys(t).filter((k) => !(k in source));
  const same = Object.keys(source).filter((k) => t[k] === source[k] && /[a-z]{4,}/i.test(source[k]));
  const ok = !missing.length && !extra.length;
  if (!ok) problems++;
  console.log(`${b}: ${ok ? 'ok' : 'FEHLER'} · ${Object.keys(source).length} Texte` +
    (missing.length ? ` · fehlend ${missing.length} (${missing.slice(0, 3).join(', ')})` : '') +
    (extra.length ? ` · überzählig ${extra.length} (${extra.slice(0, 3).join(', ')})` : '') +
    (same.length ? ` · unverändert ${same.length}` : ''));
}
process.exit(problems ? 1 : 0);
