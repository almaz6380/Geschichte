// Prüft die Oberflächentexte: Deutsch ist die Referenz, jede Sprache mit Inhalten
// muss vollständig sein und darf keine unbekannten Schlüssel enthalten.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LANGS, REF_LANG, availableLangs } from '../scripts/validate-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function strings(lang) {
  const mod = await import(path.join(ROOT, 'js', 'strings', `${lang}.js`));
  return mod.default;
}

const de = await strings(REF_LANG);
const deKeys = Object.keys(de);

test('deutsche Texte sind nicht leer', () => {
  assert.ok(deKeys.length > 30, `nur ${deKeys.length} Schlüssel`);
  for (const [k, v] of Object.entries(de)) {
    assert.equal(typeof v, 'string', `${k} ist kein Text`);
    assert.ok(v.trim().length > 0, `${k} ist leer`);
  }
});

test('Zähleinheiten haben Einzahl und Mehrzahl', () => {
  const units = new Set(deKeys.filter((k) => k.startsWith('unit.')).map((k) => k.replace(/\.(one|other)$/, '')));
  for (const u of units) {
    assert.ok(de[`${u}.one`], `${u}.one fehlt`);
    assert.ok(de[`${u}.other`], `${u}.other fehlt`);
  }
});

test('Platzhalter stimmen in allen Sprachen überein', async () => {
  const placeholders = (s) => (s.match(/\{[a-zA-Z]+\}/g) || []).sort().join(',');
  for (const lang of LANGS) {
    if (lang === REF_LANG) continue;
    const dict = await strings(lang);
    for (const [k, v] of Object.entries(dict)) {
      assert.ok(k in de, `${lang}: unbekannter Schlüssel ${k}`);
      assert.equal(placeholders(v), placeholders(de[k]), `${lang}/${k}: andere Platzhalter`);
    }
  }
});

test('Sprachen mit Inhalten haben vollständige Oberflächentexte', async () => {
  for (const lang of availableLangs()) {
    if (lang === REF_LANG) continue;
    const dict = await strings(lang);
    const fehlend = deKeys.filter((k) => !(k in dict));
    assert.equal(fehlend.length, 0, `${lang}: ${fehlend.length} Texte fehlen, z. B. ${fehlend.slice(0, 5).join(', ')}`);
  }
});

test('index.html verweist nur auf bekannte Schlüssel', () => {
  const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const used = [...html.matchAll(/data-i18n(?:-aria|-title|-content)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(used.length > 10, `nur ${used.length} Verweise gefunden`);
  for (const key of used) assert.ok(key in de, `index.html nutzt unbekannten Schlüssel ${key}`);
});

test('alle im Code verwendeten Schlüssel sind auf Deutsch hinterlegt', async () => {
  const { readdirSync } = await import('node:fs');
  const dirs = [path.join(ROOT, 'js'), path.join(ROOT, 'js', 'views')];
  const used = new Set();
  for (const dir of dirs) {
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
      const src = readFileSync(path.join(dir, f), 'utf8');
      for (const m of src.matchAll(/\bt\('([a-z][a-zA-Z0-9.]*)'/g)) used.add(m[1]);
      // plural(n, 'unit.x') braucht .one und .other
      for (const m of src.matchAll(/\bplural\([^,]+,\s*'([a-z][a-zA-Z0-9.]*)'/g)) {
        used.add(`${m[1]}.one`);
        used.add(`${m[1]}.other`);
      }
    }
  }
  const fehlend = [...used].filter((k) => !(k in de)).sort();
  assert.equal(fehlend.length, 0, `nicht hinterlegt: ${fehlend.join(', ')}`);
});
