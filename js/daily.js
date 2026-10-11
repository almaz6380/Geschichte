// DOM-freie Logik für die Tägliche Challenge: jeden Tag dieselben fünf Fragen
// (aus dem Datum abgeleitet) und eine Serie aufeinanderfolgender Spieltage.
import { MIXED, pickQuestions, createSession, seededRng } from './quiz.js';

export const DAILY_COUNT = 5;
const HISTORY_DAYS = 60;

const pad = (n) => String(n).padStart(2, '0');

// Lokales Datum als "JJJJ-MM-TT".
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function daysBetween(a, b) {
  return dayNumber(b) - dayNumber(a);
}

export function dailySeed(key) {
  return Number(key.replace(/-/g, ''));
}

export function dailySession(quizByEpoch, key) {
  const rng = seededRng(dailySeed(key));
  const questions = pickQuestions(quizByEpoch, MIXED, rng).slice(0, DAILY_COUNT);
  return createSession(questions, rng);
}

export const EMPTY_DAILY = () => ({ lastDate: null, streak: 0, best: 0, history: {} });

// Serie, wie sie heute angezeigt wird: abgerissen, wenn gestern nicht gespielt wurde.
export function currentStreak(state, today) {
  if (!state.lastDate) return 0;
  return daysBetween(state.lastDate, today) <= 1 ? state.streak : 0;
}

export function playedToday(state, today) {
  return state.lastDate === today;
}

// Ergebnis eintragen; ein zweites Spiel am selben Tag ändert nichts.
export function recordDaily(state, today, results) {
  if (state.lastDate === today) return state;
  const streak = state.lastDate && daysBetween(state.lastDate, today) === 1 ? state.streak + 1 : 1;
  const history = { ...state.history, [today]: results.map((r) => (r ? 1 : 0)).join('') };
  const keys = Object.keys(history).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - HISTORY_DAYS))) delete history[k];
  return { lastDate: today, streak, best: Math.max(state.best, streak), history };
}

// Teilbares Ergebnis, z. B. "Weltgeschichte 2026-10-10 · 4/5\n🟩🟩🟥🟩🟩\n🔥 3".
export function shareText(appName, today, results, streak) {
  const correct = results.filter(Boolean).length;
  const grid = results.map((r) => (r ? '🟩' : '🟥')).join('');
  return `${appName} ${today} · ${correct}/${results.length}\n${grid}\n🔥 ${streak}`;
}
