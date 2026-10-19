// Warteschlange für Übersetzer-Agenten: gibt den nächsten offenen Block einer Sprache aus und
// reserviert ihn (Sperre verfällt nach 45 Minuten, falls ein Agent abbricht).
//   node translate/next.mjs <lang>      -> Dateiname oder FERTIG
import { readdirSync, existsSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const lang = process.argv[2];
mkdirSync(`translate/${lang}`, { recursive: true });
const ok = (f) => {
  if (!existsSync(`translate/${lang}/${f}`)) return false;
  try { execFileSync('node', ['translate/check.mjs', lang, f], { stdio: 'ignore' }); return true; } catch { return false; }
};
for (const f of readdirSync('translate/src').filter((x) => x.endsWith('.json')).sort()) {
  if (ok(f)) continue;
  const lock = `translate/${lang}/.lock-${f}`;
  if (existsSync(lock) && Date.now() - statSync(lock).mtimeMs > 45 * 60_000) rmSync(lock, { recursive: true, force: true });
  try { mkdirSync(lock); } catch { continue; }
  console.log(f);
  process.exit(0);
}
console.log('FERTIG');
