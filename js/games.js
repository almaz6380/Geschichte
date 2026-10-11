// DOM-freie Logik für die Spiele „Zeitleiste sortieren“, „Jahr schätzen“ und „Wer bin ich?“.
import { shuffle } from './quiz.js';

export const SORT_ROUNDS = 5;
export const SORT_SIZE = 5;
export const YEAR_ROUNDS = 10;
export const WHO_ROUNDS = 5;
export const WHO_MAX_HINTS = 5;
const NOW = 2026;

// ---------- Zeitleiste sortieren ----------

// k Ereignisse mit unterschiedlichen Jahren, die mindestens minGap Jahre auseinanderliegen.
export function pickSortRound(events, rng = Math.random, k = SORT_SIZE, minGap = 5) {
  const chosen = [];
  for (const ev of shuffle(events, rng)) {
    if (chosen.every((c) => Math.abs(c.year - ev.year) >= minGap)) chosen.push(ev);
    if (chosen.length === k) break;
  }
  if (chosen.length < k) return null;
  return { shown: chosen, solution: [...chosen].sort((a, b) => a.year - b.year).map((e) => e.id) };
}

// Wie viele Ereignisse stehen an der richtigen Stelle?
export function scoreOrder(orderIds, solutionIds) {
  return orderIds.reduce((n, id, i) => n + (solutionIds[i] === id ? 1 : 0), 0);
}

export function moveItem(list, from, to) {
  const a = [...list];
  if (to < 0 || to >= a.length || from === to) return a;
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
}

// ---------- Jahr schätzen ----------

// Wichtige Ereignisse mit genauem Jahr bevorzugen; sehr frühe Ereignisse sind immer ungefähr.
export function pickYearRound(events, rng = Math.random, n = YEAR_ROUNDS) {
  const pool = events.filter((e) => e.importance >= 2 && (!e.approx || e.year < -3000));
  return shuffle(pool, rng).slice(0, n);
}

// Halbwertsbreite der Wertung: je länger her, desto großzügiger.
export function yearTolerance(year) {
  return Math.max(5, Math.abs(NOW - year) * 0.05);
}

// 100 Punkte für das genaue Jahr (bei Zeiträumen: jedes Jahr darin),
// 50 bei einer Abweichung von yearTolerance(year).
export function scoreYearGuess(guess, year, endYear = null) {
  if (!Number.isFinite(guess)) return 0;
  const end = Number.isFinite(endYear) && endYear > year ? endYear : year;
  const d = guess < year ? year - guess : guess > end ? guess - end : 0;
  return Math.round(100 * Math.pow(0.5, d / yearTolerance(year)));
}

// Eingabe (positive Zahl + Zeitrechnung) in ein Jahr umrechnen; kein Jahr 0.
export function toYear(value, bc) {
  const n = Math.abs(Math.round(Number(value)));
  if (!Number.isFinite(n) || n === 0) return NaN;
  return bc ? -n : n;
}

// ---------- Wer bin ich? ----------

// Personen mit genug Angaben für Hinweise.
export function whoPool(persons) {
  return persons.filter((p) => p.role && p.epochId && p.regionId);
}

// Vier Antwortmöglichkeiten: die gesuchte Person und drei andere, bevorzugt aus derselben Epoche.
export function pickWhoRound(persons, rng = Math.random, n = WHO_ROUNDS) {
  const pool = whoPool(persons);
  return shuffle(pool, rng).slice(0, n).map((target) => {
    const same = shuffle(pool.filter((p) => p.id !== target.id && p.epochId === target.epochId), rng);
    const other = shuffle(pool.filter((p) => p.id !== target.id && p.epochId !== target.epochId), rng);
    const distract = [...same, ...other].slice(0, 3);
    return { target, options: shuffle([target, ...distract], rng) };
  });
}

// Weniger Hinweise = mehr Punkte (5 bei einem Hinweis, 1 bei allen).
export function whoPoints(hintsShown, correct) {
  if (!correct) return 0;
  return Math.max(1, WHO_MAX_HINTS + 1 - hintsShown);
}
