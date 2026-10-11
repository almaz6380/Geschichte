import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIXED, seededRng } from '../js/quiz.js';
import { newDuel, duelSession, encodeDuel, decodeDuel, addPlayer, mergeDuels, standings, DUEL_COUNT, MAX_PLAYERS } from '../js/duel.js';
import { createHotseat, current, hsAnswer, hsNext, hsScores } from '../js/hotseat.js';
import { pickSortRound, scoreOrder, moveItem, pickYearRound, scoreYearGuess, toYear, pickWhoRound, whoPoints } from '../js/games.js';
import { dateKey, daysBetween, dailySession, recordDaily, currentStreak, playedToday, shareText, EMPTY_DAILY, DAILY_COUNT } from '../js/daily.js';
import { dueCards, rate, boxCounts, dueCount, INTERVALS, BOXES } from '../js/cards.js';
import { loadData } from '../scripts/validate-data.mjs';

const db = loadData();
const quizByEpoch = new Map(db.epochs.map((e) => [e.id, db.quiz.filter((q) => q.epochId === e.id)]));
const byId = new Map(db.quiz.map((q) => [q.id, q]));

// ---------- Duell per Link ----------

test('Duell: gleicher Link ergibt dieselben Fragen in derselben Antwortreihenfolge', () => {
  const duel = newDuel(quizByEpoch, MIXED, seededRng(3));
  assert.equal(duel.ids.length, DUEL_COUNT);
  const a = duelSession(duel, byId);
  const b = duelSession(decodeDuel(encodeDuel(duel)), byId);
  assert.deepEqual(a.questions.map((q) => [q.id, q.choices, q.answer]), b.questions.map((q) => [q.id, q.choices, q.answer]));
});

test('Duell: Kodieren und Dekodieren erhält Spieler und Antworten', () => {
  let duel = newDuel(quizByEpoch, 'rom', seededRng(9));
  const session = duelSession(duel, byId);
  const perfect = session.questions.map((q) => q.answer);
  duel = addPlayer(duel, 'Ännchen 🙂', perfect);
  duel = addPlayer(duel, 'Bob', perfect.map((a, i) => (i < 3 ? (a + 1) % 4 : a)));
  const back = decodeDuel(encodeDuel(duel));
  assert.deepEqual(back.players, duel.players);
  const rows = standings(back, session);
  assert.equal(rows[0].name, 'Ännchen 🙂');
  assert.equal(rows[0].correct, duel.ids.length);
  assert.equal(rows[1].correct, duel.ids.length - 3);
});

test('Duell: unbeantwortete Fragen und gleicher Name', () => {
  let duel = newDuel(quizByEpoch, MIXED, seededRng(5));
  duel = addPlayer(duel, 'Kim', [0, null]);
  duel = addPlayer(duel, 'kim', [1]);
  assert.equal(duel.players.length, 1);
  const back = decodeDuel(encodeDuel(duel));
  assert.equal(back.players[0].answers.length, duel.ids.length);
  assert.equal(back.players[0].answers[0], 1);
  assert.equal(back.players[0].answers[1], null);
});

test('Duell: ungültige Links werden abgelehnt', () => {
  for (const bad of ['', 'xyz', '%%%', encodeURIComponent('{"v":1}'), 'eyJ2IjoyfQ', 'a'.repeat(5000)]) assert.equal(decodeDuel(bad), null, bad);
  const duel = addPlayer(newDuel(quizByEpoch, MIXED, seededRng(1)), 'A', []);
  const json = JSON.parse(Buffer.from(encodeDuel(duel), 'base64url').toString());
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  assert.equal(decodeDuel(enc({ ...json, q: ['<script>'] })), null);
  assert.equal(decodeDuel(enc({ ...json, p: [['A', '12']] })), null);
  assert.equal(decodeDuel(enc({ ...json, p: [['', '-'.repeat(json.q.length)]] })), null);
  assert.equal(decodeDuel(enc({ ...json, s: 0 })), null);
});

test('Duell: fehlende Fragen ergeben keine Runde', () => {
  const duel = { ...newDuel(quizByEpoch, MIXED, seededRng(2)) };
  duel.ids = [...duel.ids.slice(1), 'q-gibt-es-nicht-99'];
  assert.equal(duelSession(duel, byId), null);
});

test('Duell: Zusammenführen und Spielerhöchstzahl', () => {
  let a = newDuel(quizByEpoch, MIXED, seededRng(4));
  a = addPlayer(a, 'A', [0]);
  const b = addPlayer({ ...a, players: [] }, 'B', [1]);
  const m = mergeDuels(a, b);
  assert.deepEqual(m.players.map((p) => p.name), ['A', 'B']);
  let many = a;
  for (let i = 0; i < MAX_PLAYERS + 3; i++) many = addPlayer(many, `P${i}`, []);
  assert.equal(many.players.length, MAX_PLAYERS);
});

// ---------- Duell an einem Gerät ----------

test('Hotseat: alle antworten nacheinander, dann Auflösung und Rangliste', () => {
  const qs = db.quiz.slice(0, 3);
  const s = createHotseat(['A', 'B'], qs, seededRng(1));
  for (let i = 0; i < qs.length; i++) {
    const { question } = current(s);
    assert.equal(current(s).player.name, 'A');
    hsAnswer(s, question.answer);
    assert.equal(s.phase, 'answer');
    assert.equal(current(s).player.name, 'B');
    hsAnswer(s, (question.answer + 1) % 4);
    assert.equal(s.phase, 'reveal');
    hsAnswer(s, 0); // in der Auflösung ohne Wirkung
    hsNext(s);
  }
  assert.equal(s.phase, 'done');
  assert.deepEqual(hsScores(s), [{ name: 'A', correct: 3 }, { name: 'B', correct: 0 }]);
});

// ---------- Zeitleiste sortieren ----------

test('Sortieren: Runde mit Abstand und richtiger Lösung', () => {
  const r = pickSortRound(db.events, seededRng(11), 5, 10);
  assert.equal(r.shown.length, 5);
  const years = r.solution.map((id) => db.events.find((e) => e.id === id).year);
  for (let i = 1; i < years.length; i++) assert.ok(years[i] - years[i - 1] >= 10);
  assert.equal(scoreOrder(r.solution, r.solution), 5);
  assert.equal(scoreOrder([...r.solution].reverse(), r.solution), 1);
  assert.equal(pickSortRound(db.events.slice(0, 2), seededRng(1)), null);
});

test('Sortieren: Verschieben', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, 1), ['a', 'c', 'b']);
  assert.deepEqual(moveItem(['a', 'b'], 0, -1), ['a', 'b']);
});

// ---------- Jahr schätzen ----------

test('Jahr schätzen: Wertung', () => {
  assert.equal(scoreYearGuess(1789, 1789), 100);
  assert.ok(scoreYearGuess(1799, 1789) > 50 && scoreYearGuess(1799, 1789) < 60);
  assert.ok(scoreYearGuess(1950, 1945) >= 49 && scoreYearGuess(1950, 1945) <= 51);
  assert.ok(scoreYearGuess(-500, -480) > 85);
  assert.ok(scoreYearGuess(1000, 1945) < 5);
  assert.equal(scoreYearGuess(NaN, 1945), 0);
  assert.equal(scoreYearGuess(1940, 1939, 1945), 100);
  assert.equal(scoreYearGuess(1950, 1939, 1945), scoreYearGuess(1950, 1945));
  assert.equal(toYear('44', true), -44);
  assert.equal(toYear('1492', false), 1492);
  assert.ok(Number.isNaN(toYear('0', false)));
  assert.ok(Number.isNaN(toYear('', false)));
  const round = pickYearRound(db.events, seededRng(2));
  assert.equal(round.length, 10);
  for (const e of round) assert.ok(e.importance >= 2);
});

// ---------- Wer bin ich? ----------

test('Wer bin ich: vier verschiedene Optionen mit der gesuchten Person', () => {
  for (const r of pickWhoRound(db.persons, seededRng(8))) {
    assert.equal(r.options.length, 4);
    assert.equal(new Set(r.options.map((p) => p.id)).size, 4);
    assert.ok(r.options.some((p) => p.id === r.target.id));
  }
  assert.equal(whoPoints(1, true), 5);
  assert.equal(whoPoints(5, true), 1);
  assert.equal(whoPoints(2, false), 0);
});

// ---------- Tägliche Challenge ----------

test('Tägliche Challenge: gleiche Fragen am selben Tag, andere am nächsten', () => {
  const a = dailySession(quizByEpoch, '2026-10-10');
  const b = dailySession(quizByEpoch, '2026-10-10');
  const c = dailySession(quizByEpoch, '2026-10-11');
  assert.equal(a.questions.length, DAILY_COUNT);
  assert.deepEqual(a.questions.map((q) => [q.id, q.answer]), b.questions.map((q) => [q.id, q.answer]));
  assert.notDeepEqual(a.questions.map((q) => q.id), c.questions.map((q) => q.id));
});

test('Tägliche Challenge: Serie zählt, reißt ab und ein zweites Spiel zählt nicht', () => {
  let s = EMPTY_DAILY();
  s = recordDaily(s, '2026-02-27', [true]);
  s = recordDaily(s, '2026-02-28', [true]);
  s = recordDaily(s, '2026-03-01', [false]); // Monatswechsel
  assert.equal(s.streak, 3);
  assert.equal(recordDaily(s, '2026-03-01', [true]), s);
  assert.ok(playedToday(s, '2026-03-01'));
  assert.equal(currentStreak(s, '2026-03-02'), 3);
  assert.equal(currentStreak(s, '2026-03-03'), 0);
  s = recordDaily(s, '2026-03-05', [true]);
  assert.equal(s.streak, 1);
  assert.equal(s.best, 3);
  assert.equal(s.history['2026-03-01'], '0');
  assert.equal(daysBetween('2025-12-31', '2026-01-01'), 1);
  assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(shareText('WG', '2026-01-05', [true, false], 2), 'WG 2026-01-05 · 1/2\n🟩🟥\n🔥 2');
});

test('Tägliche Challenge: Verlauf bleibt begrenzt', () => {
  let s = EMPTY_DAILY();
  for (let i = 0; i < 100; i++) s = recordDaily(s, dateKey(new Date(2026, 0, 1 + i)), [true]);
  assert.equal(Object.keys(s.history).length, 60);
  assert.equal(s.streak, 100);
});

// ---------- Karteikarten ----------

test('Karteikarten: Leitner-Fächer und Fälligkeit', () => {
  const ids = ['a', 'b', 'c'];
  let s = {};
  s = rate(s, 'a', true, 100);
  assert.deepEqual(s.a, { box: 1, due: 100 + INTERVALS[0] });
  s = rate(s, 'a', true, 100);
  assert.deepEqual(s.a, { box: 2, due: 100 + INTERVALS[1] });
  for (let i = 0; i < 10; i++) s = rate(s, 'a', true, 100);
  assert.equal(s.a.box, BOXES);
  s = rate(s, 'a', false, 100);
  assert.equal(s.a.box, 1);
  s = rate(s, 'b', true, 100);
  s = rate(s, 'b', true, 100);
  assert.equal(dueCount(ids, s, 100), 1);
  assert.equal(dueCount(ids, s, 101), 2);
  assert.deepEqual(boxCounts(ids, s), [1, 1, 1, 0, 0, 0]);
  const due = dueCards(ids, s, 100, seededRng(1));
  assert.ok(due.includes('a') && due.includes('c') && !due.includes('b'));
});
