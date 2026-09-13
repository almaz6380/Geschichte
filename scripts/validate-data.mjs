// Validiert die Inhaltsdaten in data/*.json: Pflichtfelder, ID-Eindeutigkeit,
// Referenzintegrität, Wertebereiche und Mindestmengen.
// Aufruf: node scripts/validate-data.mjs   (Exit-Code 1 bei Fehlern)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = /^[a-z0-9-]+$/;

export function loadData(dir = path.join(ROOT, 'data')) {
  const read = (f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
  return {
    regions: read('regions.json'),
    epochs: read('epochs.json'),
    events: read('events.json'),
    persons: read('persons.json'),
    quiz: read('quiz.json'),
  };
}

function isInt(v) { return Number.isInteger(v); }
function isStr(v, min = 1) { return typeof v === 'string' && v.trim().length >= min; }
function isStrArr(v, min = 0) { return Array.isArray(v) && v.length >= min && v.every((s) => isStr(s)); }

export function validate(db) {
  const errors = [];
  const err = (m) => errors.push(m);
  const ids = new Map();
  const uniq = (type, id) => {
    if (!isStr(id) || !SLUG.test(id)) return err(`${type}: ungültige ID "${id}"`);
    if (ids.has(id)) return err(`${type}: ID "${id}" bereits vergeben (${ids.get(id)})`);
    ids.set(id, type);
  };

  const regionIds = new Set();
  for (const r of db.regions) {
    uniq('region', r.id);
    regionIds.add(r.id);
    if (!isStr(r.name)) err(`region ${r.id}: name fehlt`);
    if (!/^#[0-9a-f]{6}$/i.test(r.color || '')) err(`region ${r.id}: color ungültig`);
  }

  const epochIds = new Set();
  const orders = new Set();
  for (const e of db.epochs) {
    uniq('epoch', e.id);
    epochIds.add(e.id);
    if (!isStr(e.title)) err(`epoch ${e.id}: title fehlt`);
    if (!isInt(e.order) || orders.has(e.order)) err(`epoch ${e.id}: order fehlt oder doppelt`);
    orders.add(e.order);
    if (!isInt(e.start) || !isInt(e.end) || e.start > e.end) err(`epoch ${e.id}: start/end ungültig`);
    if (!/^#[0-9a-f]{6}$/i.test(e.color || '')) err(`epoch ${e.id}: color ungültig`);
    if (!isStrArr(e.regions, 1) || !e.regions.every((r) => regionIds.has(r))) err(`epoch ${e.id}: regions ungültig`);
    if (!isStr(e.summary, 20)) err(`epoch ${e.id}: summary zu kurz`);
    if (!isStrArr(e.overview, 3)) err(`epoch ${e.id}: overview braucht ≥ 3 Absätze`);
    if (!isStrArr(e.consequences, 3)) err(`epoch ${e.id}: consequences braucht ≥ 3 Punkte`);
    if (!isStrArr(e.tags, 3)) err(`epoch ${e.id}: tags braucht ≥ 3 Einträge`);
  }

  const personIds = new Set();
  for (const p of db.persons) {
    uniq('person', p.id);
    personIds.add(p.id);
    if (!isStr(p.name)) err(`person ${p.id}: name fehlt`);
    if (!(p.born === null || isInt(p.born))) err(`person ${p.id}: born ungültig`);
    if (!(p.died === null || isInt(p.died))) err(`person ${p.id}: died ungültig`);
    if (isInt(p.born) && isInt(p.died) && p.born > p.died) err(`person ${p.id}: born > died`);
    if (typeof p.approx !== 'boolean') err(`person ${p.id}: approx fehlt`);
    if (!epochIds.has(p.epochId)) err(`person ${p.id}: epochId "${p.epochId}" unbekannt`);
    if (!regionIds.has(p.regionId)) err(`person ${p.id}: regionId "${p.regionId}" unbekannt`);
    if (!isStr(p.role)) err(`person ${p.id}: role fehlt`);
    if (!isStr(p.summary, 10)) err(`person ${p.id}: summary fehlt`);
    if (!isStr(p.text, 40)) err(`person ${p.id}: text zu kurz`);
    if (!isStrArr(p.tags, 1)) err(`person ${p.id}: tags fehlen`);
  }

  for (const ev of db.events) {
    uniq('event', ev.id);
    if (!isStr(ev.title)) err(`event ${ev.id}: title fehlt`);
    if (!isInt(ev.year)) err(`event ${ev.id}: year ungültig`);
    if (!(ev.endYear === null || ev.endYear === undefined || isInt(ev.endYear))) err(`event ${ev.id}: endYear ungültig`);
    if (isInt(ev.endYear) && ev.endYear < ev.year) err(`event ${ev.id}: endYear < year`);
    if (typeof ev.approx !== 'boolean') err(`event ${ev.id}: approx fehlt`);
    if (!epochIds.has(ev.epochId)) err(`event ${ev.id}: epochId "${ev.epochId}" unbekannt`);
    if (!regionIds.has(ev.regionId)) err(`event ${ev.id}: regionId "${ev.regionId}" unbekannt`);
    if (!isStr(ev.summary, 10)) err(`event ${ev.id}: summary fehlt`);
    if (!isStr(ev.text, 40)) err(`event ${ev.id}: text zu kurz`);
    if (!Array.isArray(ev.personIds)) err(`event ${ev.id}: personIds fehlt`);
    else for (const pid of ev.personIds) if (!personIds.has(pid)) err(`event ${ev.id}: personId "${pid}" unbekannt`);
    if (!isStrArr(ev.tags, 1)) err(`event ${ev.id}: tags fehlen`);
    if (![1, 2, 3].includes(ev.importance)) err(`event ${ev.id}: importance muss 1–3 sein`);
  }

  for (const q of db.quiz) {
    uniq('quiz', q.id);
    if (!epochIds.has(q.epochId)) err(`quiz ${q.id}: epochId "${q.epochId}" unbekannt`);
    if (!isStr(q.question, 5)) err(`quiz ${q.id}: question fehlt`);
    if (!isStrArr(q.choices, 4) || q.choices.length !== 4) err(`quiz ${q.id}: genau 4 choices nötig`);
    else if (new Set(q.choices).size !== 4) err(`quiz ${q.id}: choices nicht eindeutig`);
    if (!isInt(q.answer) || q.answer < 0 || q.answer > 3) err(`quiz ${q.id}: answer muss 0–3 sein`);
    if (!isStr(q.explanation, 10)) err(`quiz ${q.id}: explanation fehlt`);
    if (![1, 2, 3].includes(q.difficulty)) err(`quiz ${q.id}: difficulty muss 1–3 sein`);
  }

  // Mindestmengen pro Epoche
  for (const e of db.epochs) {
    const nEv = db.events.filter((x) => x.epochId === e.id).length;
    const nQ = db.quiz.filter((x) => x.epochId === e.id).length;
    if (nEv < 6) err(`epoch ${e.id}: nur ${nEv} Ereignisse (≥ 6 nötig)`);
    if (nQ < 5) err(`epoch ${e.id}: nur ${nQ} Quizfragen (≥ 5 nötig)`);
  }

  return errors;
}

export function stats(db) {
  return {
    regionen: db.regions.length,
    epochen: db.epochs.length,
    ereignisse: db.events.length,
    personen: db.persons.length,
    fragen: db.quiz.length,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = loadData();
  const errors = validate(db);
  console.log('Daten:', stats(db));
  if (errors.length) {
    console.error(`\n${errors.length} Fehler:`);
    for (const e of errors) console.error(' -', e);
    process.exit(1);
  }
  console.log('Validierung erfolgreich.');
}
