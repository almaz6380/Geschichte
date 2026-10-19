// Prüft übersetzte Blöcke: gleiche Schlüssel wie die Vorlage, nur nichtleere Strings,
// Quiz-Antworten je Frage verschieden. Aufruf: node translate/check.mjs <lang> [datei ...]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const [lang, ...only] = process.argv.slice(2);
const files = only.length ? only : readdirSync('translate/src').filter((f) => f.endsWith('.json'));
let bad = 0, missingFiles = 0;
for (const f of files) {
  const src = JSON.parse(readFileSync(`translate/src/${f}`, 'utf8'));
  const p = `translate/${lang}/${f}`;
  if (!existsSync(p)) { missingFiles++; console.log(`FEHLT ${p}`); continue; }
  let tr;
  try { tr = JSON.parse(readFileSync(p, 'utf8')); } catch (e) { bad++; console.log(`KAPUTT ${p}: ${e.message}`); continue; }
  const miss = Object.keys(src).filter((k) => typeof tr[k] !== 'string' || !tr[k].trim());
  const extra = Object.keys(tr).filter((k) => !(k in src));
  const same = Object.keys(src).filter((k) => tr[k] === src[k] && src[k].length > 40);
  const choices = {};
  for (const [k, v] of Object.entries(tr)) { const m = k.match(/^(.+)#choices\.\d$/); if (m) (choices[m[1]] ||= []).push(v.trim().toLowerCase()); }
  const dup = Object.entries(choices).filter(([, c]) => new Set(c).size !== c.length).map(([id]) => id);
  if (miss.length || extra.length || dup.length || same.length > 3) {
    bad++;
    console.log(`${p}: fehlend ${miss.length}, zuviel ${extra.length}, unübersetzt ${same.length}, doppelte Antworten ${dup.join(',') || 0}`);
    if (miss.length) console.log('  z. B.', miss.slice(0, 3));
  }
}
console.log(`${lang}: ${files.length - bad - missingFiles} ok, ${bad} fehlerhaft, ${missingFiles} fehlen`);
process.exit(bad || missingFiles ? 1 : 0);
