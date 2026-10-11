// DOM-freie Logik für Karteikarten nach dem Leitner-System: Gewusste Karten wandern
// ein Fach weiter und kommen seltener, nicht gewusste zurück in Fach 1.
import { shuffle } from './quiz.js';

export const BOXES = 5;
export const INTERVALS = [0, 1, 3, 7, 14]; // Tage bis zur nächsten Wiederholung je Fach
export const SESSION_SIZE = 15;
export const NEW_PER_SESSION = 8;

export function today(d = new Date()) {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

// Fällige Karten (älteste Fälligkeit zuerst), aufgefüllt mit neuen Karten.
export function dueCards(ids, state, day, rng = Math.random, size = SESSION_SIZE) {
  const due = ids.filter((id) => state[id] && state[id].due <= day).sort((a, b) => state[a].due - state[b].due || state[a].box - state[b].box);
  const fresh = shuffle(ids.filter((id) => !state[id]), rng).slice(0, NEW_PER_SESSION);
  return shuffle([...due.slice(0, size), ...fresh].slice(0, size), rng);
}

export function rate(state, id, known, day) {
  const box = known ? Math.min(BOXES, (state[id]?.box || 0) + 1) : 1;
  return { ...state, [id]: { box, due: day + INTERVALS[box - 1] } };
}

// Wie viele Karten liegen in welchem Fach? Index 0 = noch nie gelernt.
export function boxCounts(ids, state) {
  const counts = new Array(BOXES + 1).fill(0);
  for (const id of ids) counts[state[id]?.box || 0]++;
  return counts;
}

export function dueCount(ids, state, day) {
  return ids.filter((id) => state[id] && state[id].due <= day).length;
}
