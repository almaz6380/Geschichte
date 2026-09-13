// Lädt data/*.json und baut Indizes.
export const DB = {
  regions: [], epochs: [], events: [], persons: [], quiz: [],
  regionsById: new Map(), epochsById: new Map(), eventsById: new Map(), personsById: new Map(),
  eventsByEpoch: new Map(), personsByEpoch: new Map(), quizByEpoch: new Map(), eventsByPerson: new Map(),
  eventsSorted: [],
  ready: false,
};

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Laden fehlgeschlagen: ${url} (${res.status})`);
  return res.json();
}

export async function loadData(base = './data/') {
  const [regions, epochs, events, persons, quiz] = await Promise.all([
    fetchJson(base + 'regions.json'),
    fetchJson(base + 'epochs.json'),
    fetchJson(base + 'events.json'),
    fetchJson(base + 'persons.json'),
    fetchJson(base + 'quiz.json'),
  ]);
  buildIndexes({ regions, epochs, events, persons, quiz });
  return DB;
}

export function buildIndexes({ regions, epochs, events, persons, quiz }) {
  DB.regions = regions;
  DB.epochs = [...epochs].sort((a, b) => a.order - b.order);
  DB.events = events;
  DB.persons = persons;
  DB.quiz = quiz;

  DB.regionsById = new Map(regions.map((r) => [r.id, r]));
  DB.epochsById = new Map(DB.epochs.map((e) => [e.id, e]));
  DB.eventsById = new Map(events.map((e) => [e.id, e]));
  DB.personsById = new Map(persons.map((p) => [p.id, p]));

  DB.eventsSorted = [...events].sort((a, b) => a.year - b.year || a.title.localeCompare(b.title, 'de'));

  DB.eventsByEpoch = new Map();
  DB.personsByEpoch = new Map();
  DB.quizByEpoch = new Map();
  DB.eventsByPerson = new Map();
  for (const e of DB.epochs) {
    DB.eventsByEpoch.set(e.id, []);
    DB.personsByEpoch.set(e.id, []);
    DB.quizByEpoch.set(e.id, []);
  }
  for (const ev of DB.eventsSorted) {
    DB.eventsByEpoch.get(ev.epochId)?.push(ev);
    for (const pid of ev.personIds || []) {
      if (!DB.eventsByPerson.has(pid)) DB.eventsByPerson.set(pid, []);
      DB.eventsByPerson.get(pid).push(ev);
    }
  }
  for (const p of persons) DB.personsByEpoch.get(p.epochId)?.push(p);
  for (const list of DB.personsByEpoch.values()) list.sort((a, b) => (a.born ?? 0) - (b.born ?? 0));
  for (const q of quiz) DB.quizByEpoch.get(q.epochId)?.push(q);

  DB.ready = true;
  return DB;
}

export function randomEvent() {
  const list = DB.eventsSorted;
  return list[Math.floor(Math.random() * list.length)];
}
