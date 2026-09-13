import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadData, validate, stats } from '../scripts/validate-data.mjs';

const db = loadData();

test('Daten sind valide (Schema, Referenzen, Mengen)', () => {
  const errors = validate(db, { eventsPerEpoch: 18, quizPerEpoch: 10, personsPerEpoch: 8 });
  assert.deepEqual(errors, []);
});

test('Umfang: 14 Epochen, ≥ 250 Ereignisse, ≥ 120 Personen, ≥ 150 Fragen, ≥ 80 Begriffe, 8 Themen', () => {
  const s = stats(db);
  assert.equal(s.epochen, 14);
  assert.ok(s.ereignisse >= 250, `nur ${s.ereignisse} Ereignisse`);
  assert.ok(s.personen >= 120, `nur ${s.personen} Personen`);
  assert.ok(s.fragen >= 150, `nur ${s.fragen} Fragen`);
  assert.ok(s.begriffe >= 80, `nur ${s.begriffe} Begriffe`);
  assert.equal(s.themen, 8);
});

test('jede Epoche hat keyFacts und die vier Themenabschnitte', () => {
  for (const e of db.epochs) {
    assert.ok(e.keyFacts?.length >= 4, `${e.id}: keyFacts`);
    assert.equal(e.sections?.length, 4, `${e.id}: sections`);
  }
});

test('Epochen sind lückenlos nummeriert und chronologisch', () => {
  const sorted = [...db.epochs].sort((a, b) => a.order - b.order);
  sorted.forEach((e, i) => assert.equal(e.order, i + 1));
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i].start >= sorted[i - 1].start, `${sorted[i].id} beginnt vor ${sorted[i - 1].id}`);
});

test('jede Region kommt in mindestens einem Ereignis vor', () => {
  const used = new Set(db.events.map((e) => e.regionId));
  for (const r of db.regions) assert.ok(used.has(r.id), `Region ${r.id} ohne Ereignis`);
});

test('Ereignisse liegen im Zeitraum ihrer Epoche (mit Toleranz)', () => {
  const byId = new Map(db.epochs.map((e) => [e.id, e]));
  for (const ev of db.events) {
    const e = byId.get(ev.epochId);
    const tol = Math.max(60, Math.round((e.end - e.start) * 0.15));
    assert.ok(ev.year >= e.start - tol && ev.year <= e.end + tol, `${ev.id} (${ev.year}) außerhalb von ${e.id} (${e.start}–${e.end})`);
  }
});

test('jedes Thema verbindet mindestens 4 Epochen', () => {
  const epochOf = new Map(db.events.map((e) => [e.id, e.epochId]));
  for (const t of db.themes) {
    const epochs = new Set(t.eventIds.map((id) => epochOf.get(id)));
    assert.ok(epochs.size >= 4, `${t.id} deckt nur ${epochs.size} Epochen ab`);
  }
});

test('Quiz: richtige Antworten sind über die Positionen verteilt', () => {
  const counts = [0, 0, 0, 0];
  for (const q of db.quiz) counts[q.answer]++;
  for (const c of counts) assert.ok(c >= db.quiz.length * 0.12, `Antwortpositionen ungleich verteilt: ${counts}`);
});
