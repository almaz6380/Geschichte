import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { READY_CODES, setLang } from '../js/i18n.js';
import { formatYear, formatRange } from '../js/ui.js';
import { createSession, relocalize } from '../js/quiz.js';

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('Versionsnummer ist überall gleich (App Store ordnet Builds danach zu)', () => {
  const pkg = JSON.parse(read('package.json')).version;
  const web = read('js/version.js').match(/APP_VERSION = '([^']+)'/)[1];
  const ios = [...read('ios/App/App.xcodeproj/project.pbxproj').matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((m) => m[1]);
  const android = read('android/app/build.gradle').match(/versionName "([^"]+)"/)[1];
  assert.equal(web, pkg);
  assert.equal(android, pkg);
  assert.ok(ios.length > 0);
  for (const v of ios) assert.equal(v, pkg);
});

test('Service Worker speichert alle Dateien vorab, die es gibt und die offline nötig sind', () => {
  const sw = read('sw.js');
  const list = [...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);
  for (const f of list) assert.ok(existsSync(new URL('../' + f, import.meta.url)), `fehlt: ${f}`);
  const files = ['regions', 'epochs', 'events', 'persons', 'quiz', 'glossary', 'themes'];
  for (const lang of READY_CODES) for (const f of files) assert.ok(list.includes(`data/${lang}/${f}.json`), `nicht vorab gespeichert: data/${lang}/${f}.json`);
  for (const page of ['datenschutz.html', 'impressum.html', 'privacy.html', 'imprint.html']) assert.ok(list.includes(page), page);
});

test('Jahreszahlen einheitlich formatiert', () => {
  setLang('de');
  assert.equal(formatYear(-2055), '2055 v. Chr.');
  assert.equal(formatYear(-12000), '12.000 v. Chr.');
  assert.equal(formatRange(-2055, -1650), '2055–1650 v. Chr.');
  assert.equal(formatRange(800, 1200), '800–1200 n. Chr.');
  assert.equal(formatRange(-44, 14), '44 v. Chr. – 14 n. Chr.');
  assert.equal(formatYear(0), '1 v. Chr.');
  setLang('en');
  assert.equal(formatRange(800, 1200), '800–1200 AD');
  setLang('de');
});

test('Quizrunde übersteht einen Sprachwechsel mit gleicher Antwortreihenfolge', () => {
  const de = JSON.parse(read('data/de/quiz.json')).slice(0, 5);
  const en = new Map(JSON.parse(read('data/en/quiz.json')).map((q) => [q.id, q]));
  const session = createSession(de);
  session.answers[0] = session.questions[0].answer;
  const before = session.questions.map((q) => ({ id: q.id, answer: q.answer, order: q.order }));
  relocalize(session, en);
  session.questions.forEach((q, i) => {
    assert.equal(q.id, before[i].id);
    assert.equal(q.answer, before[i].answer);
    const src = en.get(q.id);
    assert.equal(q.choices[q.answer], src.choices[src.answer]);
  });
  assert.equal(session.answers[0], session.questions[0].answer);
});

test('Service Worker kennt jede Skript- und Stildatei der App', async () => {
  const { readdirSync } = await import('node:fs');
  const sw = read('sw.js');
  const files = [
    ...readdirSync(new URL('../js/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`),
    ...readdirSync(new URL('../js/views/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => `js/views/${f}`),
    ...readdirSync(new URL('../js/strings/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => `js/strings/${f}`),
    ...readdirSync(new URL('../css/', import.meta.url)).filter((f) => f.endsWith('.css')).map((f) => `css/${f}`),
  ];
  for (const f of files) assert.ok(sw.includes(`'./${f}'`), `nicht vorab gespeichert: ${f}`);
});

test('Startsprache: Gerätesprache, sonst Englisch', async () => {
  const { detectLang } = await import('../js/i18n.js');
  assert.equal(detectLang(['de-AT']), 'de');
  assert.equal(detectLang(['en-US']), 'en');
  assert.equal(detectLang(['ar', 'he']), 'en');
  assert.equal(detectLang(['ar', 'de-DE']), 'de');
  assert.equal(detectLang(['ko-KR']), 'ko');
  assert.equal(detectLang(['id-ID']), 'id');
  assert.equal(detectLang(['fr-CA']), 'fr');
  assert.equal(detectLang([]), 'en');
});

test('CSS spiegelt sich für Arabisch: keine physischen Links/Rechts-Abstände', () => {
  // Erlaubt ist nur die Zentrierung über left: 50% + translateX(-50%).
  const bad = /(margin|padding|border)-(left|right)\b|text-align:\s*(left|right)|float:\s*(left|right)|(^|[\s;{])(left|right):(?!\s*50%)/;
  for (const f of readdirSync(new URL('../css/', import.meta.url)).filter((x) => x.endsWith('.css'))) {
    readFileSync(new URL(`../css/${f}`, import.meta.url), 'utf8').split('\n').forEach((line, i) => {
      assert.ok(!bad.test(line), `css/${f}:${i + 1} nutzt links/rechts statt inline-start/-end: ${line.trim()}`);
    });
  }
});
