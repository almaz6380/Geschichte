// Gemeinsamer Fragenablauf für Quiz, Duell und Tägliche Challenge.
import { DB } from '../data.js';
import { esc, progressBar, announce, showToast } from '../ui.js';
import { answer, next, isFinished, fiftyFifty } from '../quiz.js';
import { roundFinished, rewardAvailable, requestReward } from '../ads.js';
import { t } from '../i18n.js';

export const KEYS = ['A', 'B', 'C', 'D'];

// Tastaturbedienung der aktuell gezeichneten Frage (nur eine Frage ist je sichtbar).
let onKey = null;
export function setKeyHandler(fn) { onKey = fn; }

// Die gerade gezeigte Sitzung; ein Joker-Video, das erst nach einem Seitenwechsel endet, zeichnet nicht mehr.
let shownSession = null;

// In render() aufrufen; die Rückgabe ist die Aufräumfunktion der View.
export function bindQuizKeys() {
  const listener = (e) => onKey?.(e);
  document.addEventListener('keydown', listener);
  return () => { document.removeEventListener('keydown', listener); onKey = null; };
}

export function difficultyBadge(q) {
  const key = ['', 'quiz.difficulty.easy', 'quiz.difficulty.medium', 'quiz.difficulty.hard'][q.difficulty] || 'quiz.difficulty.medium';
  return `<span class="badge diff-${q.difficulty}">${esc(t(key))}</span>`;
}

// Antwortknöpfe; reveal markiert richtig/falsch, removed sind vom Joker ausgeblendete Antworten.
export function choicesHtml(q, { chosen, reveal = false, removed = [] } = {}) {
  return `<div class="quiz-choices" role="group" aria-labelledby="quiz-q">
    ${q.choices.map((c, i) => {
      let cls = 'quiz-choice';
      if (reveal && i === q.answer) cls += ' correct';
      else if (reveal && i === chosen) cls += ' wrong';
      const gone = removed.includes(i) && !reveal;
      if (gone) cls += ' removed';
      return `<button type="button" class="${cls}" data-i="${i}" ${reveal || gone ? 'disabled' : ''}><span class="key">${KEYS[i]}</span><span>${esc(c)}</span></button>`;
    }).join('')}
  </div>`;
}

// A–D bzw. 1–4 wählen, Enter löst onEnter aus (nicht bei Eingaben mit Modifikatoren).
export function keyHandler({ count, onChoose, onEnter }) {
  return (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, select, textarea')) return;
    const k = e.key.toUpperCase();
    const i = KEYS.indexOf(k) >= 0 ? KEYS.indexOf(k) : ['1', '2', '3', '4'].indexOf(k);
    if (onChoose && i >= 0 && i < count) { e.preventDefault(); onChoose(i); }
    else if (onEnter && e.key === 'Enter' && !e.target.closest?.('button, a')) { e.preventDefault(); onEnter(); }
  };
}

// Spielt eine Sitzung (quiz.js createSession) durch und ruft am Ende onDone() auf.
// opts: { title, color, back (HTML), showEpoch, onAnswer(q, chosen), joker }
// joker: 50:50 gegen ein Werbevideo anbieten (nur im normalen Quiz, nicht im Duell oder der
// Tageschallenge, sonst wären die Ergebnisse nicht mehr vergleichbar).
export function runSession(el, session, opts) {
  const { title, color = 'var(--accent)', back = '', showEpoch = false, onDone, onAnswer, joker = false } = opts;
  shownSession = session;

  function draw() {
    if (isFinished(session)) {
      onKey = null;
      onDone();
      // Einmal pro Runde, nicht bei jedem Neuzeichnen (z. B. nach einem Sprachwechsel).
      if (!session.counted) { session.counted = true; roundFinished(); }
      return;
    }
    const q = session.questions[session.index];
    const chosen = session.answers[session.index];
    const answered = chosen !== undefined;
    const removed = session.removed?.[session.index] || [];
    const offerJoker = joker && !answered && !session.jokerUsed && rewardAvailable();
    const n = session.index + 1;
    const total = session.questions.length;
    const qEpoch = DB.epochsById.get(q.epochId);

    el.innerHTML = `
      ${back}
      <div class="quiz-card card" style="--epoch-color:${color}">
        <div class="quiz-top"><span>${esc(title)}</span><span>${esc(t('quiz.questionOf', { n, total }))}</span></div>
        ${progressBar(((n - (answered ? 0 : 1)) / total) * 100, t('quiz.questionOf', { n, total }))}
        <div class="quiz-sub">${showEpoch && qEpoch ? `<span class="muted">${esc(qEpoch.title)}</span>` : '<span></span>'}${difficultyBadge(q)}</div>
        <div class="quiz-question" id="quiz-q">${esc(q.question)}</div>
        ${choicesHtml(q, { chosen, reveal: answered, removed })}
        ${offerJoker ? `<div class="quiz-joker"><button type="button" class="btn btn-small" id="quiz-joker">${esc(t('quiz.joker'))}</button><span class="muted">${esc(t('quiz.joker.hint'))}</span></div>` : ''}
        ${answered ? '' : `<p class="muted quiz-keyhint">${esc(t('quiz.keyHint'))}</p>`}
        ${answered ? `
          <div class="quiz-feedback ${chosen === q.answer ? 'ok' : 'nok'}">
            <b>${chosen === q.answer ? esc(t('quiz.correct')) : esc(t('quiz.wrong', { answer: q.choices[q.answer] }))}</b>
            ${esc(q.explanation)}
          </div>
          <div class="quiz-actions"><button type="button" class="btn btn-primary" id="quiz-next">${esc(n === total ? t('quiz.finish') : t('quiz.next'))}</button></div>
        ` : ''}
      </div>
    `;
    const choose = (i) => {
      answer(session, i);
      onAnswer?.(q, i);
      draw();
      announce(i === q.answer ? t('quiz.correct') : t('quiz.wrong', { answer: q.choices[q.answer] }));
    };
    const goNext = () => { next(session); draw(); };
    el.querySelectorAll('.quiz-choice').forEach((b) => b.addEventListener('click', () => choose(Number(b.dataset.i))));
    el.querySelector('#quiz-next')?.addEventListener('click', goNext);
    el.querySelector('#quiz-joker')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      const index = session.index;
      const hash = location.hash;
      const outcome = await requestReward();
      // Inzwischen beantwortet, weitergeblättert oder die Seite gewechselt: Joker nicht mehr anwenden.
      if (shownSession !== session || location.hash !== hash || session.index !== index || session.answers[index] !== undefined) return;
      if (outcome === 'earned') { fiftyFifty(session); announce(t('quiz.joker.used')); }
      else showToast(t(outcome === 'aborted' ? 'quiz.joker.aborted' : 'quiz.joker.unavailable'));
      draw();
    });
    (el.querySelector('#quiz-next') || el.querySelector('.quiz-choice:not(:disabled)'))?.focus({ preventScroll: true });
    const pick = (i) => { if (!removed.includes(i)) choose(i); };
    onKey = keyHandler({ count: q.choices.length, onChoose: answered ? null : pick, onEnter: answered ? goNext : null });
  }

  draw();
}

// Liste falsch beantworteter Fragen für die Auswertung.
export function reviewList(wrong) {
  if (!wrong.length) return `<p style="margin-top:16px">${esc(t('quiz.allCorrect'))}</p>`;
  return `
    <div class="quiz-wrong-list">
      <h3>${esc(t('quiz.review'))}</h3>
      <ol>${wrong.map(({ question: q }) => `<li><div class="q">${esc(q.question)}</div><div class="a">${esc(t('quiz.answerWas', { answer: q.choices[q.answer] }))} ${esc(q.explanation)}</div></li>`).join('')}</ol>
    </div>`;
}

export function focusScore(el) {
  const score = el.querySelector('.quiz-score');
  if (!score) return;
  score.setAttribute('tabindex', '-1');
  score.focus({ preventScroll: true });
}
