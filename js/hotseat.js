// DOM-freie Logik für Duelle an einem Gerät: Alle Spieler beantworten dieselbe Frage
// nacheinander, ohne die Antwort der anderen zu sehen; danach wird aufgelöst.
import { createSession } from './quiz.js';

export const MIN_PLAYERS = 2;
export const MAX_HOTSEAT = 4;

export function createHotseat(names, questions, rng = Math.random) {
  const session = createSession(questions, rng);
  return {
    questions: session.questions,
    players: names.map((name) => ({ name, answers: [] })),
    q: 0, // aktuelle Frage
    turn: 0, // wer gerade antwortet
    phase: 'answer', // 'answer' | 'reveal' | 'done'
  };
}

export function current(state) {
  return { question: state.questions[state.q], player: state.players[state.turn] };
}

export function hsAnswer(state, choice) {
  if (state.phase !== 'answer') return state;
  state.players[state.turn].answers[state.q] = choice;
  if (state.turn < state.players.length - 1) state.turn++;
  else state.phase = 'reveal';
  return state;
}

export function hsNext(state) {
  if (state.phase !== 'reveal') return state;
  state.q++;
  state.turn = 0;
  state.phase = state.q >= state.questions.length ? 'done' : 'answer';
  return state;
}

export function hsScores(state) {
  return state.players
    .map((p) => ({ name: p.name, correct: state.questions.reduce((n, q, i) => n + (p.answers[i] === q.answer ? 1 : 0), 0) }))
    .sort((a, b) => b.correct - a.correct);
}
