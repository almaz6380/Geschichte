import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIXED, MIXED_COUNT, MAX_PER_EPOCH_MIXED, EPOCH_COUNT, seededRng, pickQuestions, shuffleChoices, createSession, answer, next, isFinished, evaluate } from '../js/quiz.js';
import { loadData } from '../scripts/validate-data.mjs';

function quizByEpoch(db) {
  const m = new Map();
  for (const e of db.epochs) m.set(e.id, db.quiz.filter((q) => q.epochId === e.id));
  return m;
}

test('Epochen-Modus liefert bis zu EPOCH_COUNT Fragen der Epoche ohne Dopplung', () => {
  const db = loadData();
  const map = quizByEpoch(db);
  const qs = pickQuestions(map, 'rom', seededRng(7));
  assert.equal(qs.length, Math.min(EPOCH_COUNT, map.get('rom').length));
  const all = new Set(map.get('rom').map((q) => q.id));
  for (const q of qs) assert.ok(all.has(q.id));
  assert.equal(new Set(qs.map((q) => q.id)).size, qs.length);
});

test('Gemischt-Modus: MIXED_COUNT Fragen, max. 2 pro Epoche', () => {
  const db = loadData();
  const qs = pickQuestions(quizByEpoch(db), MIXED, seededRng(42));
  assert.equal(qs.length, MIXED_COUNT);
  const per = {};
  for (const q of qs) per[q.epochId] = (per[q.epochId] || 0) + 1;
  for (const n of Object.values(per)) assert.ok(n <= MAX_PER_EPOCH_MIXED);
});

test('shuffleChoices behält die richtige Antwort', () => {
  const q = { question: '?', choices: ['a', 'b', 'c', 'd'], answer: 2 };
  for (let s = 1; s < 20; s++) {
    const sq = shuffleChoices(q, seededRng(s));
    assert.equal(sq.choices[sq.answer], 'c');
    assert.deepEqual([...sq.choices].sort(), ['a', 'b', 'c', 'd']);
  }
});

test('Session-Ablauf und Bewertung', () => {
  const qs = [
    { id: '1', question: 'A', choices: ['x', 'y', 'z', 'w'], answer: 0 },
    { id: '2', question: 'B', choices: ['x', 'y', 'z', 'w'], answer: 1 },
  ];
  const s = createSession(qs, seededRng(3));
  assert.equal(isFinished(s), false);
  next(s); // ohne Antwort kein Fortschritt
  assert.equal(s.index, 0);
  answer(s, s.questions[0].answer); next(s);
  answer(s, (s.questions[1].answer + 1) % 4); next(s);
  assert.equal(isFinished(s), true);
  const r = evaluate(s);
  assert.equal(r.correct, 1);
  assert.equal(r.total, 2);
  assert.equal(r.percent, 50);
  assert.equal(r.wrong.length, 1);
  assert.equal(r.wrong[0].question.id, '2');
});
