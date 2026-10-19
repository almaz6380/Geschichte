import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSession, answer, fiftyFifty, seededRng } from '../js/quiz.js';
import { bannerAllowed } from '../js/ads.js';

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const Q = (id) => ({ id, question: id, choices: ['a', 'b', 'c', 'd'], answer: 0, explanation: '', difficulty: 1 });

test('50:50-Joker blendet zwei falsche Antworten aus, einmal pro Runde', () => {
  const s = createSession([Q('1'), Q('2')], seededRng(3));
  const gone = fiftyFifty(s, seededRng(5));
  assert.equal(gone.length, 2);
  assert.ok(!gone.includes(s.questions[0].answer));
  assert.equal(new Set(gone).size, 2);
  assert.deepEqual(s.removed[0], gone);
  assert.deepEqual(fiftyFifty(s), [], 'zweiter Joker in derselben Runde');
});

test('50:50-Joker nicht nach dem Antworten', () => {
  const s = createSession([Q('1')]);
  answer(s, 1);
  assert.deepEqual(fiftyFifty(s), []);
  assert.ok(!s.jokerUsed);
});

test('Kein Banner, wo gespielt wird', () => {
  for (const p of [[''], ['epochen'], ['epoche', 'antike'], ['quiz'], ['mehr'], ['zeitleiste']]) assert.ok(bannerAllowed(p), p.join('/'));
  for (const p of [['quiz', 'gemischt'], ['duell'], ['duell', 'lokal'], ['spiel', 'jahr'], ['wer-bin-ich'], ['taeglich'], ['karten']]) assert.ok(!bannerAllowed(p), p.join('/'));
});

test('Joker nur im normalen Quiz, nicht im Duell und in der Tageschallenge', () => {
  assert.match(read('js/views/quiz.js'), /joker: true/);
  for (const f of ['duel', 'daily', 'hotseat']) assert.doesNotMatch(read(`js/views/${f}.js`), /joker/);
});

test('AdMob-App-IDs stehen nativ und passen zum Testmodus', () => {
  const ads = read('js/ads.js');
  const testMode = /const USE_TEST_ADS = true;/.test(ads);
  const android = read('android/app/src/main/AndroidManifest.xml').match(/APPLICATION_ID"\s+android:value="([^"]+)"/)?.[1];
  const ios = read('ios/App/App/Info.plist').match(/<key>GADApplicationIdentifier<\/key>\s*<string>([^<]+)<\/string>/)?.[1];
  assert.ok(android && ios, 'App-ID fehlt in AndroidManifest.xml oder Info.plist');
  assert.match(read('ios/App/App/Info.plist'), /NSUserTrackingUsageDescription/);
  const isTestId = (id) => id.startsWith('ca-app-pub-3940256099942544~');
  if (!testMode) {
    // Echte Anzeigen: echte App-IDs und alle Blöcke eingetragen.
    assert.ok(!isTestId(android) && !isTestId(ios), 'echte App-IDs eintragen');
    assert.doesNotMatch(ads.match(/const PROD = \{[\s\S]*?\n\};/)[0], /: ''/, 'Anzeigenblock fehlt in PROD');
  }
});
