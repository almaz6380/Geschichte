// Lädt die Inhaltsdateien einer Sprache aus data/<code>/ und baut die Indizes.
import { compare, ordinal, t } from './i18n.js';
export const DB = {
  regions: [], epochs: [], events: [], persons: [], quiz: [], glossary: [], themes: [],
  regionsById: new Map(), epochsById: new Map(), eventsById: new Map(), personsById: new Map(),
  termsById: new Map(), themesById: new Map(),
  eventsByEpoch: new Map(), personsByEpoch: new Map(), quizByEpoch: new Map(), eventsByPerson: new Map(),
  termsByEpoch: new Map(), eventsByRegion: new Map(), personsByRegion: new Map(),
  themesByEvent: new Map(), themesByPerson: new Map(), themesByEpoch: new Map(),
  eventsSorted: [],
  ready: false,
};

async function fetchJson(url, optional = false) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) {
    if (optional) return [];
    throw new Error(`Laden fehlgeschlagen: ${url} (${res.status})`);
  }
  return res.json();
}

export async function loadData(base = './data/') {
  const [regions, epochs, events, persons, quiz, glossary, themes] = await Promise.all([
    fetchJson(base + 'regions.json'),
    fetchJson(base + 'epochs.json'),
    fetchJson(base + 'events.json'),
    fetchJson(base + 'persons.json'),
    fetchJson(base + 'quiz.json'),
    fetchJson(base + 'glossary.json', true),
    fetchJson(base + 'themes.json', true),
  ]);
  buildIndexes({ regions, epochs, events, persons, quiz, glossary, themes });
  return DB;
}

export function buildIndexes({ regions, epochs, events, persons, quiz, glossary = [], themes = [] }) {
  DB.regions = regions;
  DB.epochs = [...epochs].sort((a, b) => a.order - b.order);
  DB.events = events;
  DB.persons = persons;
  DB.quiz = quiz;
  DB.glossary = [...glossary].sort((a, b) => compare(a.term, b.term));
  DB.themes = themes;

  DB.regionsById = new Map(regions.map((r) => [r.id, r]));
  DB.epochsById = new Map(DB.epochs.map((e) => [e.id, e]));
  DB.eventsById = new Map(events.map((e) => [e.id, e]));
  DB.personsById = new Map(persons.map((p) => [p.id, p]));
  DB.termsById = new Map(DB.glossary.map((g) => [g.id, g]));
  DB.themesById = new Map(themes.map((t) => [t.id, t]));

  DB.eventsSorted = [...events].sort((a, b) => a.year - b.year || compare(a.title, b.title));

  const mapOf = (keys) => new Map(keys.map((k) => [k, []]));
  DB.eventsByEpoch = mapOf(DB.epochs.map((e) => e.id));
  DB.personsByEpoch = mapOf(DB.epochs.map((e) => e.id));
  DB.quizByEpoch = mapOf(DB.epochs.map((e) => e.id));
  DB.termsByEpoch = mapOf(DB.epochs.map((e) => e.id));
  DB.themesByEpoch = mapOf(DB.epochs.map((e) => e.id));
  DB.eventsByRegion = mapOf(regions.map((r) => r.id));
  DB.personsByRegion = mapOf(regions.map((r) => r.id));
  DB.eventsByPerson = new Map();
  DB.themesByEvent = new Map();
  DB.themesByPerson = new Map();

  for (const ev of DB.eventsSorted) {
    DB.eventsByEpoch.get(ev.epochId)?.push(ev);
    DB.eventsByRegion.get(ev.regionId)?.push(ev);
    for (const pid of ev.personIds || []) {
      if (!DB.eventsByPerson.has(pid)) DB.eventsByPerson.set(pid, []);
      DB.eventsByPerson.get(pid).push(ev);
    }
  }
  for (const p of persons) {
    DB.personsByEpoch.get(p.epochId)?.push(p);
    DB.personsByRegion.get(p.regionId)?.push(p);
  }
  for (const list of DB.personsByEpoch.values()) list.sort((a, b) => (a.born ?? 0) - (b.born ?? 0));
  for (const q of quiz) DB.quizByEpoch.get(q.epochId)?.push(q);
  for (const g of DB.glossary) if (g.epochId) DB.termsByEpoch.get(g.epochId)?.push(g);

  for (const t of themes) {
    const epochSet = new Set();
    for (const id of t.eventIds || []) {
      if (!DB.themesByEvent.has(id)) DB.themesByEvent.set(id, []);
      DB.themesByEvent.get(id).push(t);
      const ev = DB.eventsById.get(id);
      if (ev) epochSet.add(ev.epochId);
    }
    for (const id of t.personIds || []) {
      if (!DB.themesByPerson.has(id)) DB.themesByPerson.set(id, []);
      DB.themesByPerson.get(id).push(t);
    }
    for (const eid of epochSet) DB.themesByEpoch.get(eid)?.push(t);
  }

  DB.ready = true;
  return DB;
}

export function randomEvent() {
  const list = DB.eventsSorted;
  return list[Math.floor(Math.random() * list.length)];
}

// Ereignisse eines Themas, chronologisch
export function themeEvents(theme) {
  return (theme.eventIds || []).map((id) => DB.eventsById.get(id)).filter(Boolean).sort((a, b) => a.year - b.year);
}

// Jahrhundert-Label für Gruppierungen, z. B. "5. Jahrhundert v. Chr."
export function centuryLabel(year) {
  if (year <= -10000) return t('century.earliest');
  if (year < 0) return t('century.bc', { n: ordinal(Math.ceil(-year / 100)) });
  return t('century.ad', { n: ordinal(Math.floor((year - 1) / 100) + 1) });
}

export function centuryKey(year) {
  if (year <= -10000) return -1000;
  if (year < 0) return -Math.ceil(-year / 100);
  return Math.floor((year - 1) / 100) + 1;
}
