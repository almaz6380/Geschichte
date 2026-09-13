// DOM-freie Quiz-Logik.
export const MIXED = 'gemischt';
export const MIXED_COUNT = 20;
export const EPOCH_COUNT = 10;
export const MAX_PER_EPOCH_MIXED = 2;

export function seededRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// quizByEpoch: Map<epochId, Question[]>
export function pickQuestions(quizByEpoch, mode, rng = Math.random) {
  if (mode === MIXED) {
    const pools = [...quizByEpoch.entries()].map(([id, qs]) => [id, shuffle(qs, rng).slice(0, MAX_PER_EPOCH_MIXED)]);
    let all = pools.flatMap(([, qs]) => qs);
    all = shuffle(all, rng).slice(0, MIXED_COUNT);
    return all;
  }
  return shuffle(quizByEpoch.get(mode) || [], rng).slice(0, EPOCH_COUNT);
}

export function shuffleChoices(q, rng = Math.random) {
  const idx = shuffle([0, 1, 2, 3], rng);
  return {
    ...q,
    choices: idx.map((i) => q.choices[i]),
    answer: idx.indexOf(q.answer),
  };
}

export function createSession(questions, rng = Math.random) {
  return {
    questions: questions.map((q) => shuffleChoices(q, rng)),
    index: 0,
    answers: [], // gewählter Index pro Frage
  };
}

export function answer(session, choiceIndex) {
  if (session.index >= session.questions.length) return session;
  session.answers[session.index] = choiceIndex;
  return session;
}

export function next(session) {
  if (session.answers[session.index] === undefined) return session;
  session.index++;
  return session;
}

export function isFinished(session) {
  return session.index >= session.questions.length;
}

export function evaluate(session) {
  const total = session.questions.length;
  let correct = 0;
  const wrong = [];
  session.questions.forEach((q, i) => {
    if (session.answers[i] === q.answer) correct++;
    else wrong.push({ question: q, chosen: session.answers[i] });
  });
  const percent = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percent, wrong };
}

export function grade(percent) {
  if (percent >= 90) return 'Hervorragend!';
  if (percent >= 75) return 'Sehr gut!';
  if (percent >= 50) return 'Gut gemacht.';
  return 'Weiter üben!';
}
