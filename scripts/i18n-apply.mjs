// Setzt übersetzte Texte in die Datenstruktur ein und schreibt data/<sprache>/*.json.
// Grundlage ist immer die deutsche Datei: Struktur, IDs, Jahreszahlen und Verweise
// werden unverändert übernommen, ersetzt werden nur die Textfelder.
//
//   node scripts/i18n-apply.mjs <sprache> [quellordner]
//
// Quellordner enthält <datei>.<nn>.json mit { "<id>#<pfad>": "übersetzter Text" }.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { FILES, walkTexts } from './i18n-extract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function setPath(obj, trail, value) {
  let cur = obj;
  for (let i = 0; i < trail.length - 1; i++) cur = cur[trail[i]];
  cur[trail[trail.length - 1]] = value;
}

export function applyLang(lang, srcDir) {
  const outDir = path.join(ROOT, 'data', lang);
  mkdirSync(outDir, { recursive: true });
  const report = [];
  for (const name of FILES) {
    const items = JSON.parse(readFileSync(path.join(ROOT, 'data', 'de', `${name}.json`), 'utf8'));
    // Alle Blöcke dieser Datei einsammeln.
    const texts = {};
    const parts = existsSync(srcDir)
      ? readdirSync(srcDir).filter((f) => f.startsWith(`${name}.`) && f.endsWith('.json')).sort()
      : [];
    for (const f of parts) Object.assign(texts, JSON.parse(readFileSync(path.join(srcDir, f), 'utf8')));

    let done = 0;
    let missing = 0;
    const out = items.map((item) => {
      const copy = structuredClone(item);
      walkTexts(item, (p) => {
        const key = `${item.id}#${p}`;
        const value = texts[key];
        const trail = p.split('.').map((s) => (/^\d+$/.test(s) ? Number(s) : s));
        if (typeof value === 'string' && value.trim()) { setPath(copy, trail, value); done += 1; }
        else missing += 1;
      }, []);
      return copy;
    });
    writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(out, null, 2) + '\n');
    report.push({ datei: name, übersetzt: done, fehlend: missing });
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const lang = process.argv[2];
  if (!lang) { console.error('Aufruf: node scripts/i18n-apply.mjs <sprache> [quellordner]'); process.exit(1); }
  const srcDir = path.resolve(ROOT, process.argv[3] || `translate/${lang}`);
  const report = applyLang(lang, srcDir);
  console.table(report);
  const fehlend = report.reduce((a, r) => a + r.fehlend, 0);
  console.log(fehlend ? `${fehlend} Texte fehlen noch (deutsche Fassung bleibt stehen).` : 'Alle Texte übersetzt.');
}
