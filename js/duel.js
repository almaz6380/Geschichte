// DOM-freie Logik für Duelle per Link: Die Fragen-IDs und ein Seed stehen im Link,
// so bekommen alle Mitspieler dieselben Fragen in derselben Antwortreihenfolge –
// ganz ohne Server. Die Antworten jedes Spielers reisen im Link mit.
import { pickQuestions, createSession, seededRng } from './quiz.js';

export const DUEL_VERSION = 1;
export const DUEL_COUNT = 10;
export const MAX_PLAYERS = 8;
export const MAX_NAME = 20;

export function cleanName(name) {
  return String(name ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, MAX_NAME);
}

// Neues Duell: Modus (Epoche oder gemischt), zufälliger Seed, feste Fragenliste.
export function newDuel(quizByEpoch, mode, rng = Math.random) {
  const seed = Math.floor(rng() * 2147483646) + 1;
  const ids = pickQuestions(quizByEpoch, mode, seededRng(seed)).slice(0, DUEL_COUNT).map((q) => q.id);
  return { v: DUEL_VERSION, seed, mode, ids, players: [] };
}

// Spielrunde zu einem Duell; null, wenn eine Frage in dieser App-Version fehlt.
export function duelSession(duel, questionsById) {
  const questions = duel.ids.map((id) => questionsById.get(id));
  if (!questions.length || questions.some((q) => !q)) return null;
  return createSession(questions, seededRng(duel.seed ^ 0x2f6b1d));
}

export function scoreAnswers(session, answers) {
  return session.questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
}

// Spieler eintragen; gleicher Name ersetzt den alten Eintrag.
export function addPlayer(duel, name, answers) {
  const n = cleanName(name);
  const players = duel.players.filter((p) => p.name.toLowerCase() !== n.toLowerCase());
  players.push({ name: n, answers: [...answers] });
  return { ...duel, players: players.slice(-MAX_PLAYERS) };
}

// Rangliste: { name, correct, answers } absteigend nach richtigen Antworten.
export function standings(duel, session) {
  return duel.players
    .map((p) => ({ ...p, correct: scoreAnswers(session, p.answers) }))
    .sort((a, b) => b.correct - a.correct);
}

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

// Kompakt: Antworten als Ziffernfolge ("0213…", "-" = nicht beantwortet).
export function encodeDuel(duel) {
  const payload = {
    v: DUEL_VERSION,
    s: duel.seed,
    m: duel.mode,
    q: duel.ids,
    p: duel.players.map((p) => [p.name, duel.ids.map((_, i) => {
      const a = p.answers[i];
      return Number.isInteger(a) && a >= 0 && a <= 3 ? a : '-';
    }).join('')]),
  };
  return toBase64Url(JSON.stringify(payload));
}

const ID_RE = /^[a-z0-9-]{1,80}$/;

// Liest einen Link-Parameter; alles Ungültige ergibt null.
export function decodeDuel(str) {
  if (typeof str !== 'string' || !str || str.length > 4000) return null;
  let o;
  try { o = JSON.parse(fromBase64Url(str)); } catch { return null; }
  if (!o || o.v !== DUEL_VERSION) return null;
  if (!Number.isInteger(o.s) || o.s < 1) return null;
  if (typeof o.m !== 'string' || !ID_RE.test(o.m)) return null;
  if (!Array.isArray(o.q) || !o.q.length || o.q.length > 30 || !o.q.every((id) => typeof id === 'string' && ID_RE.test(id))) return null;
  if (!Array.isArray(o.p) || o.p.length > MAX_PLAYERS) return null;
  const players = [];
  for (const entry of o.p) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const [name, ans] = entry;
    const n = cleanName(name);
    if (!n || typeof ans !== 'string' || ans.length !== o.q.length || !/^[0-3-]*$/.test(ans)) return null;
    players.push({ name: n, answers: [...ans].map((c) => (c === '-' ? null : Number(c))) });
  }
  return { v: o.v, seed: o.s, mode: o.m, ids: o.q, players };
}

// Zwei Stände desselben Duells zusammenführen (z. B. gespeicherter und neuer Link).
export function mergeDuels(a, b) {
  let out = { ...a, players: [...a.players] };
  for (const p of b.players) out = addPlayer(out, p.name, p.answers);
  return out;
}
