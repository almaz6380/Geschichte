import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, tokenize, buildIndex, search, makeSnippet } from '../js/search.js';
import { loadData } from '../scripts/validate-data.mjs';

test('normalize: Umlaute, ß, Diakritika, Sonderzeichen', () => {
  assert.equal(normalize('Völkerschlacht bei Leipzig!'), 'voelkerschlacht bei leipzig');
  assert.equal(normalize('Straße – Café'), 'strasse cafe');
  assert.deepEqual(tokenize('Der  Kalte Krieg'), ['kalte', 'krieg']);
  // Nur Füllwörter: trotzdem suchen statt leer zurückzugeben.
  assert.deepEqual(tokenize('der die'), ['der', 'die']);
});

test('Suche findet Titeltreffer zuerst', () => {
  const db = loadData();
  const index = buildIndex(db);
  const res = search(index, 'Caesar');
  assert.ok(res.length > 0);
  assert.equal(res[0].doc.type, 'person');
  assert.match(res[0].doc.title, /Caesar/);
});

test('Suche ist tolerant gegenüber Umlaut-Schreibweise', () => {
  const db = loadData();
  const index = buildIndex(db);
  const a = search(index, 'Römisch').map((r) => r.doc.id);
  const b = search(index, 'roemisch').map((r) => r.doc.id);
  assert.deepEqual(a, b);
  assert.ok(a.length > 0);
});

test('zu kurze Anfrage liefert nichts', () => {
  const db = loadData();
  const index = buildIndex(db);
  assert.deepEqual(search(index, 'a'), []);
  assert.deepEqual(search(index, ''), []);
});

test('Snippet markiert Treffer', () => {
  const s = makeSnippet('Der Fall der Berliner Mauer beendete die Teilung.', ['mauer'], (x) => x);
  assert.match(s, /<mark>Mauer<\/mark>/);
});

test('Mehrwort-Suche: Treffer für alle Wörter verdrängen Teiltreffer', () => {
  const db = loadData();
  const index = buildIndex(db);
  const res = search(index, 'Karl der Große');
  assert.ok(res.length > 0);
  assert.match(res[0].doc.title, /Karl der Große/);
  const stem = (tk) => ([...tk].length >= 6 ? [...tk].slice(0, -2).join('') : tk);
  assert.ok(res.every((r) => r.tokens.every((tk) => [tk, stem(tk)].some((x) => r.doc.titleN.includes(x) || r.doc.textN.includes(x) || r.doc.tagsN.some((tag) => tag.includes(x))))));
});

test('Jahreszahlen finden die Ereignisse dieses Jahres', () => {
  const db = loadData();
  const index = buildIndex(db);
  const res = search(index, '1789');
  assert.ok(res.length > 0);
  const top = res[0].doc;
  assert.equal(top.type, 'event');
  const ev = db.events.find((e) => e.id === top.id);
  assert.ok(ev.year === 1789 || ev.endYear === 1789);
});
