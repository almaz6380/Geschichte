import { test } from 'node:test';
import assert from 'node:assert/strict';
import { darfBewertungFragen, AB_RUNDE, ABSTAND_MS } from '../js/review.js';

const T = 1_800_000_000_000;

test('Bewertungsbitte erst ab der fünften Runde', () => {
  assert.equal(darfBewertungFragen({ runden: AB_RUNDE - 1, zuletzt: 0 }, T, false), false);
  assert.equal(darfBewertungFragen({ runden: AB_RUNDE, zuletzt: 0 }, T, false), true);
});

test('Nie zusammen mit einer Vollbildanzeige', () => {
  assert.equal(darfBewertungFragen({ runden: 20, zuletzt: 0 }, T, true), false);
});

test('Höchstens alle 90 Tage', () => {
  assert.equal(darfBewertungFragen({ runden: 20, zuletzt: T - ABSTAND_MS + 1 }, T, false), false);
  assert.equal(darfBewertungFragen({ runden: 20, zuletzt: T - ABSTAND_MS }, T, false), true);
});
