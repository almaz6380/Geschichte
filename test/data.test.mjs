import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadData, validate, stats } from '../scripts/validate-data.mjs';

const db = loadData();

test('Daten sind valide (Schema, Referenzen, Mengen)', () => {
  const errors = validate(db);
  assert.deepEqual(errors, []);
});

test('Umfang: 14 Epochen, ≥ 100 Ereignisse, ≥ 50 Personen, ≥ 70 Fragen', () => {
  const s = stats(db);
  assert.equal(s.epochen, 14);
  assert.ok(s.ereignisse >= 100, `nur ${s.ereignisse} Ereignisse`);
  assert.ok(s.personen >= 50, `nur ${s.personen} Personen`);
  assert.ok(s.fragen >= 70, `nur ${s.fragen} Fragen`);
});

test('Epochen sind lückenlos nummeriert und chronologisch', () => {
  const sorted = [...db.epochs].sort((a, b) => a.order - b.order);
  sorted.forEach((e, i) => assert.equal(e.order, i + 1));
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i].start >= sorted[i - 1].start, `${sorted[i].id} beginnt vor ${sorted[i - 1].id}`);
});

test('jede Epoche hat mindestens 5 Fragen und 6 Ereignisse', () => {
  for (const e of db.epochs) {
    assert.ok(db.quiz.filter((q) => q.epochId === e.id).length >= 5, e.id);
    assert.ok(db.events.filter((ev) => ev.epochId === e.id).length >= 6, e.id);
  }
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
