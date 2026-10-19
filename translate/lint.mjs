// Findet fremde Schriften in Übersetzungen (z. B. chinesische Zeichen im Spanischen).
//   node translate/lint.mjs <lang>
import { readFileSync, readdirSync } from 'node:fs';
const lang = process.argv[2];
const CJK = /[぀-ヿ㐀-鿿가-힯]/;
const KANA = /[぀-ヿ]/;
const CYR = /[Ѐ-ӿ]/;
const bad = { fr: [CJK, CYR], es: [CJK, CYR], it: [CJK, CYR], pt: [CJK, CYR], ru: [CJK], ja: [CYR, /[가-힯]/], zh: [CYR, KANA, /[가-힯]/] }[lang];
let n = 0;
for (const f of readdirSync(`translate/${lang}`).filter((x) => x.endsWith('.json') && !x.startsWith('.'))) {
  const d = JSON.parse(readFileSync(`translate/${lang}/${f}`, 'utf8'));
  for (const [k, v] of Object.entries(d)) if (bad.some((r) => r.test(v))) { n++; console.log(`${f} ${k}: ${v.slice(0, 120)}`); }
}
console.log(`${lang}: ${n} Auffälligkeiten`);
