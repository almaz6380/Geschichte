// Findet fremde Schriften in Übersetzungen (z. B. chinesische Zeichen im Spanischen).
//   node translate/lint.mjs <lang>
import { readFileSync, readdirSync } from 'node:fs';
const lang = process.argv[2];
const CJK = /[぀-ヿ㐀-鿿가-힯]/;
const KANA = /[぀-ヿ]/;
const CYR = /[Ѐ-ӿ]/;
const bad = { fr: [CJK, CYR], es: [CJK, CYR], it: [CJK, CYR], pt: [CJK, CYR], ru: [CJK], ja: [CYR, /[가-힯]/], zh: [CYR, KANA, /[가-힯]/], ko: [CYR, KANA], tr: [CJK, CYR], pl: [CJK, CYR], nl: [CJK, CYR], id: [CJK, CYR], ar: [CJK, CYR] }[lang];
let n = 0;
for (const f of readdirSync(`translate/${lang}`).filter((x) => x.endsWith('.json') && !x.startsWith('.'))) {
  const d = JSON.parse(readFileSync(`translate/${lang}/${f}`, 'utf8'));
  const src = JSON.parse(readFileSync(`translate/src/${f}`, 'utf8'));
  for (const [k, v] of Object.entries(d)) {
    let why = bad.some((r) => r.test(v)) ? 'fremde Schrift' : '';
    // Geschweifte Klammern nur, wo die Vorlage sie hat.
    if (!why && /[{}]/.test(v) && !/[{}]/.test(src[k] || '')) why = 'Klammer';
    // Russisch, Japanisch, Chinesisch: englische Restwörter (klein geschrieben, keine Namen).
    if (!why && ['ru', 'ja', 'zh', 'ko', 'ar'].includes(lang)) {
      const w = (v.match(/\b[a-z]{5,}\b/g) || []).filter((x) => !(src[k] || '').includes(x) || true);
      if (w.length) why = `englisch? ${w.slice(0, 3).join(' ')}`;
    }
    if (why) { n++; console.log(`${f} ${k} [${why}]: ${v.slice(0, 100)}`); }
  }
}
console.log(`${lang}: ${n} Auffälligkeiten`);
