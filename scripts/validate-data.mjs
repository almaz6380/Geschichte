// Validiert die Inhaltsdaten in data/*.json: Pflichtfelder, ID-Eindeutigkeit,
// Referenzintegrität, Wertebereiche und Mindestmengen.
// Aufruf: node scripts/validate-data.mjs   (Exit-Code 1 bei Fehlern)
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = /^[a-z0-9-]+$/;
const SECTION_IDS = ['herrschaft', 'gesellschaft', 'kultur', 'wirtschaft'];

export function loadData(dir = path.join(ROOT, 'data')) {
  const read = (f, fallback) => {
    const p = path.join(dir, f);
    if (!existsSync(p)) return fallback;
    return JSON.parse(readFileSync(p, 'utf8'));
  };
  return {
    regions: read('regions.json', []),
    epochs: read('epochs.json', []),
    events: read('events.json', []),
    persons: read('persons.json', []),
    quiz: read('quiz.json', []),
    glossary: read('glossary.json', []),
    themes: read('themes.json', []),
  };
}

function isInt(v) { return Number.isInteger(v); }
function isStr(v, min = 1) { return typeof v === 'string' && v.trim().length >= min; }
function isStrArr(v, min = 0) { return Array.isArray(v) && v.length >= min && v.every((s) => isStr(s)); }
const isColor = (c) => /^#[0-9a-f]{6}$/i.test(c || '');

export const MIN = { eventsPerEpoch: 6, quizPerEpoch: 5, personsPerEpoch: 3 };

export function validate(db, min = MIN) {
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
    if (!isColor(r.color)) err(`region ${r.id}: color ungültig`);
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
    if (!isColor(e.color)) err(`epoch ${e.id}: color ungültig`);
    if (!isStrArr(e.regions, 1) || !e.regions.every((r) => regionIds.has(r))) err(`epoch ${e.id}: regions ungültig`);
    if (!isStr(e.summary, 20)) err(`epoch ${e.id}: summary zu kurz`);
    if (!isStrArr(e.overview, 3)) err(`epoch ${e.id}: overview braucht ≥ 3 Absätze`);
    if (!isStrArr(e.consequences, 3)) err(`epoch ${e.id}: consequences braucht ≥ 3 Punkte`);
    if (!isStrArr(e.tags, 3)) err(`epoch ${e.id}: tags braucht ≥ 3 Einträge`);
    if (e.keyFacts !== undefined && !isStrArr(e.keyFacts, 4)) err(`epoch ${e.id}: keyFacts braucht ≥ 4 Punkte`);
    if (e.sections !== undefined) {
      if (!Array.isArray(e.sections) || e.sections.length !== 4) err(`epoch ${e.id}: sections müssen genau 4 sein`);
      else e.sections.forEach((s, i) => {
        if (s.id !== SECTION_IDS[i]) err(`epoch ${e.id}: section ${i} hat id "${s.id}", erwartet "${SECTION_IDS[i]}"`);
        if (!isStr(s.title)) err(`epoch ${e.id}: section ${s.id} ohne title`);
        if (!isStrArr(s.paragraphs, 2)) err(`epoch ${e.id}: section ${s.id} braucht ≥ 2 Absätze`);
      });
    }
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

  const eventIds = new Set();
  for (const ev of db.events) {
    uniq('event', ev.id);
    eventIds.add(ev.id);
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

  const termIds = new Set();
  for (const g of db.glossary) {
    uniq('term', g.id);
    termIds.add(g.id);
    if (!isStr(g.term)) err(`term ${g.id}: term fehlt`);
    if (!isStr(g.definition, 30)) err(`term ${g.id}: definition zu kurz`);
    if (g.epochId !== undefined && g.epochId !== null && !epochIds.has(g.epochId)) err(`term ${g.id}: epochId "${g.epochId}" unbekannt`);
    if (!Array.isArray(g.related)) err(`term ${g.id}: related fehlt`);
    else for (const rid of g.related) if (!eventIds.has(rid) && !personIds.has(rid) && !epochIds.has(rid)) err(`term ${g.id}: related "${rid}" unbekannt`);
  }

  for (const t of db.themes) {
    uniq('theme', t.id);
    if (!isStr(t.title)) err(`theme ${t.id}: title fehlt`);
    if (!isStr(t.summary, 20)) err(`theme ${t.id}: summary zu kurz`);
    if (!isStrArr(t.intro, 2)) err(`theme ${t.id}: intro braucht ≥ 2 Absätze`);
    if (!isColor(t.color)) err(`theme ${t.id}: color ungültig`);
    if (!Array.isArray(t.eventIds) || t.eventIds.length < 8) err(`theme ${t.id}: eventIds braucht ≥ 8 Einträge`);
    else for (const id of t.eventIds) if (!eventIds.has(id)) err(`theme ${t.id}: eventId "${id}" unbekannt`);
    if (!Array.isArray(t.personIds)) err(`theme ${t.id}: personIds fehlt`);
    else for (const id of t.personIds) if (!personIds.has(id)) err(`theme ${t.id}: personId "${id}" unbekannt`);
    if (!Array.isArray(t.termIds)) err(`theme ${t.id}: termIds fehlt`);
    else for (const id of t.termIds) if (!termIds.has(id)) err(`theme ${t.id}: termId "${id}" unbekannt`);
    if (!isStrArr(t.tags, 2)) err(`theme ${t.id}: tags fehlen`);
  }

  // Mindestmengen pro Epoche
  for (const e of db.epochs) {
    const nEv = db.events.filter((x) => x.epochId === e.id).length;
    const nQ = db.quiz.filter((x) => x.epochId === e.id).length;
    const nP = db.persons.filter((x) => x.epochId === e.id).length;
    if (nEv < min.eventsPerEpoch) err(`epoch ${e.id}: nur ${nEv} Ereignisse (≥ ${min.eventsPerEpoch} nötig)`);
    if (nQ < min.quizPerEpoch) err(`epoch ${e.id}: nur ${nQ} Quizfragen (≥ ${min.quizPerEpoch} nötig)`);
    if (nP < min.personsPerEpoch) err(`epoch ${e.id}: nur ${nP} Personen (≥ ${min.personsPerEpoch} nötig)`);
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
    begriffe: db.glossary.length,
    themen: db.themes.length,
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
