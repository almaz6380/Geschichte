// Zerlegt die deutschen Inhaltsdaten in flache Textlisten zum Übersetzen.
// Es werden ausschließlich Textfelder ausgegeben; IDs, Jahreszahlen, Farben und
// Verweise bleiben außen vor und können beim Übersetzen gar nicht verrutschen.
//
//   node scripts/i18n-extract.mjs [zielordner] [zeichen-pro-block]
//
// Ergebnis: <zielordner>/<datei>.<nn>.json mit { "<pfad>": "deutscher Text", ... }
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const FILES = ['regions', 'epochs', 'events', 'persons', 'quiz', 'glossary', 'themes'];

// Schlüssel, deren Werte niemals übersetzt werden (Verweise, Kennungen, Zahlen, Farben).
export const KEEP = new Set([
  'id', 'color', 'order', 'start', 'end', 'year', 'endYear', 'approx', 'importance',
  'born', 'died', 'answer', 'difficulty', 'epochId', 'regionId', 'regions',
  'related', 'eventIds', 'personIds', 'termIds',
]);

// Läuft durch die Struktur und ruft fn(pfad, text) für jedes übersetzbare Textfeld auf.
export function walkTexts(node, fn, trail = []) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => walkTexts(v, fn, [...trail, i]));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (KEEP.has(k)) continue;
      walkTexts(v, fn, [...trail, k]);
    }
    return;
  }
  if (typeof node === 'string') fn(trail.join('.'), node);
}

export function extractFile(name, lang = 'de') {
  const items = JSON.parse(readFileSync(path.join(ROOT, 'data', lang, `${name}.json`), 'utf8'));
  const out = {};
  items.forEach((item, i) => {
    // Die ID steht im Pfad, damit eine Übersetzung auch bei anderer Reihenfolge zuzuordnen ist.
    walkTexts(item, (p, text) => { out[`${item.id}#${p}`] = text; }, []);
    void i;
  });
  return out;
}

function chunk(obj, maxChars) {
  const chunks = [];
  let cur = {};
  let size = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (size > 0 && size + v.length > maxChars) { chunks.push(cur); cur = {}; size = 0; }
    cur[k] = v;
    size += v.length;
  }
  if (Object.keys(cur).length) chunks.push(cur);
  return chunks;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outDir = path.resolve(ROOT, process.argv[2] || 'translate/source');
  const maxChars = Number(process.argv[3] || 18000);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  let total = 0;
  let files = 0;
  for (const name of FILES) {
    const texts = extractFile(name);
    const parts = chunk(texts, maxChars);
    parts.forEach((part, i) => {
      const file = path.join(outDir, `${name}.${String(i + 1).padStart(2, '0')}.json`);
      writeFileSync(file, JSON.stringify(part, null, 2) + '\n');
      files += 1;
    });
    const chars = Object.values(texts).reduce((a, s) => a + s.length, 0);
    total += chars;
    console.log(`${name}: ${Object.keys(texts).length} Texte, ${chars} Zeichen, ${parts.length} Block/Blöcke`);
  }
  console.log(`\n${files} Dateien in ${path.relative(ROOT, outDir)}/ (${total} Zeichen gesamt).`);
}
