// Prüft die Oberflächentexte einer Sprache gegen Englisch: alle Schlüssel vorhanden,
// gleiche Platzhalter, keine leeren Werte. Aufruf: node scripts/i18n-check-ui.mjs <sprache> …
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async (l) => (await import(path.join(ROOT, 'js', 'strings', `${l}.js`) + `?t=${Date.now()}`)).default;
const en = await load('en');
const ph = (s) => (s.match(/\{[a-zA-Z]+\}/g) || []).sort().join(',');
let bad = 0;
for (const lang of process.argv.slice(2)) {
  let dict;
  try { dict = await load(lang); } catch (e) { console.log(`${lang}: DATEI FEHLERHAFT (${e.message})`); bad++; continue; }
  const problems = [];
  for (const k of Object.keys(en)) {
    if (typeof dict[k] !== 'string' || !dict[k].trim()) problems.push(`fehlt ${k}`);
    else if (ph(dict[k]) !== ph(en[k])) problems.push(`Platzhalter ${k}`);
  }
  for (const k of Object.keys(dict)) {
    const base = k.replace(/\.(zero|two|few|many)$/, '.other');
    if (!(k in en) && !(base in en)) problems.push(`unbekannt ${k}`);
  }
  const same = Object.keys(en).filter((k) => dict[k] === en[k] && /[a-z]{4,}/i.test(en[k])).length;
  console.log(`${lang}: ${problems.length ? 'FEHLER ' + problems.slice(0, 8).join('; ') + (problems.length > 8 ? ` … (+${problems.length - 8})` : '') : 'ok'} · unverändert ${same}`);
  if (problems.length) bad++;
}
process.exit(bad ? 1 : 0);
