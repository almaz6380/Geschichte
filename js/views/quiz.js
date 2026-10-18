import { DB } from '../data.js';
import { esc, setTitle, backLink, progressBar } from '../ui.js';
import { MIXED, MIXED_COUNT, EPOCH_COUNT, pickQuestions, createSession, relocalize, evaluate, grade, shuffle } from '../quiz.js';
import { getQuizProgress, saveQuizResult, resetQuizProgress, getWrongIds, updateWrongIds, getDaily, getGameBest } from '../store.js';
import { currentStreak, playedToday, dateKey, EMPTY_DAILY } from '../daily.js';
import { runSession, reviewList, focusScore, bindQuizKeys } from './quizrunner.js';
import { render as notFound } from './notfound.js';
import { t, plural } from '../i18n.js';

export const REVIEW = 'fehler';

// Laufende Runde, damit ein Sprachwechsel (Neuzeichnen) sie nicht verwirft.
let active = null;

export function render(el, { slug }, ctx) {
  if (!slug) { active = null; return renderModes(el); }
  if (slug !== MIXED && slug !== REVIEW && !DB.epochsById.has(slug)) return notFound(el, {}, { message: t('quiz.notfound') });
  const unbind = bindQuizKeys();
  renderQuiz(el, slug, ctx?.rerender);
  return unbind;
}

const num = (v) => Number(v) || 0;

function gameCard(href, title, sub, extra = '', icon = '') {
  return `<a class="card card-link game-card" href="${href}">
    <span class="game-icon" aria-hidden="true">${icon}</span>
    <span><span class="title">${esc(title)}</span><span class="sub">${esc(sub)}</span>${extra ? `<span class="best">${extra}</span>` : ''}</span>
  </a>`;
}

function bestLine(game) {
  const b = getGameBest()[game];
  return b ? `${esc(t('quiz.best'))} <b>${num(b.best)}</b>` : '';
}

function renderModes(el) {
  setTitle(t('nav.quiz'));
  const progress = getQuizProgress();
  const mixed = progress[MIXED];
  const mastered = DB.epochs.filter((e) => progress[e.id] && progress[e.id].best / progress[e.id].total >= 0.8).length;
  const daily = getDaily() || EMPTY_DAILY();
  const today = dateKey();
  const streak = currentStreak(daily, today);
  const wrongCount = getWrongIds().filter((id) => DB.quiz.some((q) => q.id === id)).length;

  el.innerHTML = `
    <h1>${esc(t('nav.quiz'))}</h1>
    <p class="muted">${esc(t('quiz.intro'))}</p>

    <section class="section">
      <h2>${esc(t('games.section'))}</h2>
      <div class="card-grid game-grid">
        ${gameCard('#/taeglich', t('daily.title'), playedToday(daily, today) ? t('daily.doneToday') : t('daily.sub'), streak ? `🔥 ${esc(plural(streak, 'unit.day'))}` : '', '📅')}
        ${gameCard('#/duell', t('duel.title'), t('duel.sub'), '', '⚔️')}
        ${gameCard('#/duell/lokal', t('hotseat.title'), t('hotseat.sub'), '', '👥')}
        ${gameCard('#/spiel/zeitleiste', t('sort.title'), t('sort.sub'), bestLine('sort'), '↕️')}
        ${gameCard('#/spiel/jahr', t('year.game.title'), t('year.game.sub'), bestLine('year'), '🎯')}
        ${gameCard('#/wer-bin-ich', t('who.title'), t('who.sub'), bestLine('who'), '❓')}
        ${gameCard('#/karten', t('cards.title'), t('cards.sub'), '', '🗂️')}
        ${wrongCount ? gameCard(`#/quiz/${REVIEW}`, t('review.title'), t('review.sub', { questions: plural(wrongCount, 'unit.question') }), '', '🔁') : ''}
      </div>
    </section>

    <section class="section">
      <h2>${esc(t('quiz.section.epochs'))}</h2>
      <div class="card" style="margin-bottom:16px">
        <div class="muted">${esc(t('quiz.mastered.label'))}</div>
        <h3>${esc(t('quiz.mastered.value', { done: mastered, total: DB.epochs.length }))}</h3>
        ${progressBar((mastered / Math.max(1, DB.epochs.length)) * 100, t('quiz.mastered.label'))}
      </div>
      <div class="card-grid">
        <a class="card card-link quiz-mode-card" href="#/quiz/${MIXED}" style="--epoch-color:var(--accent)">
          <h3>${esc(t('quiz.mixed.title'))}</h3>
          <span class="muted">${esc(t('quiz.mixed.sub', { questions: plural(MIXED_COUNT, 'unit.question') }))}</span>
          <span class="best">${mixed ? `${esc(t('quiz.best'))} <b>${num(mixed.best)}/${num(mixed.total)}</b> · ${esc(plural(num(mixed.attempts), 'unit.attempt'))}` : esc(t('quiz.notPlayed'))}</span>
        </a>
        ${DB.epochs.map((e) => {
          const n = DB.quizByEpoch.get(e.id)?.length || 0;
          const p = progress[e.id];
          return `<a class="card card-link quiz-mode-card" href="#/quiz/${e.id}" style="--epoch-color:${e.color}">
            <h3>${esc(e.title)}</h3>
            <span class="muted">${esc(t('quiz.epoch.sub', { shown: Math.min(n, EPOCH_COUNT), total: n }))}</span>
            <span class="best">${p ? `${esc(t('quiz.best'))} <b>${num(p.best)}/${num(p.total)}</b> · ${esc(plural(num(p.attempts), 'unit.attempt'))}` : esc(t('quiz.notPlayed'))}</span>
          </a>`;
        }).join('')}
      </div>
    </section>
    <div class="btn-row" style="margin-top:24px"><button type="button" class="btn btn-small" id="quiz-reset">${esc(t('quiz.reset'))}</button></div>
  `;
  el.querySelector('#quiz-reset').addEventListener('click', () => {
    if (confirm(t('quiz.reset.confirm'))) { resetQuizProgress(); renderModes(el); }
  });
}

function pickFor(mode) {
  if (mode !== REVIEW) return pickQuestions(DB.quizByEpoch, mode);
  const byId = new Map(DB.quiz.map((q) => [q.id, q]));
  return shuffle(getWrongIds().map((id) => byId.get(id)).filter(Boolean)).slice(0, EPOCH_COUNT);
}

function renderQuiz(el, mode, resume = false) {
  const epoch = DB.epochsById.get(mode) || null;
  const title = epoch ? t('quiz.epochTitle', { epoch: epoch.title }) : t(mode === REVIEW ? 'review.title' : 'quiz.mixed.title');
  const color = epoch?.color || 'var(--accent)';
  const back = backLink('#/quiz', t('quiz.back'));
  setTitle(title);
  let session;
  if (resume && active?.mode === mode) {
    session = relocalize(active.session, new Map(DB.quiz.map((q) => [q.id, q])));
  } else {
    const questions = pickFor(mode);
    if (!questions.length) {
      active = null;
      const [head, text] = mode === REVIEW ? ['review.empty.title', 'review.empty.text'] : ['quiz.noQuestions.title', 'quiz.noQuestions.text'];
      el.innerHTML = `${back}<div class="empty card"><h2>${esc(t(head))}</h2><p>${esc(t(text))}</p></div>`;
      return;
    }
    session = createSession(questions);
    active = { mode, session, saved: null };
  }
  const state = active;

  function drawResult() {
    const r = evaluate(session);
    if (!state.saved) {
      updateWrongIds(r.wrong.map((w) => w.question.id), session.questions.filter((q, i) => session.answers[i] === q.answer).map((q) => q.id));
      state.saved = mode === REVIEW ? { review: true } : saveQuizResult(mode, r.correct, r.total);
    }
    const saved = state.saved;
    el.innerHTML = `
      ${back}
      <div class="quiz-card card quiz-result" style="--epoch-color:${color}">
        <div class="muted">${esc(title)}</div>
        <h1 class="quiz-score">${r.correct} / ${r.total}</h1>
        <div class="quiz-percent">${esc(t('quiz.percentCorrect', { percent: r.percent }))} · ${esc(grade(r.percent))}</div>
        ${saved.review ? '' : `<div class="muted">${esc(t('quiz.best'))}: ${num(saved.best)}/${num(saved.total)} · ${esc(plural(num(saved.attempts), 'unit.attempt'))}</div>`}
        <div class="btn-row" style="justify-content:center;margin-top:16px">
          <button type="button" class="btn btn-primary" id="quiz-again">${esc(t('quiz.again'))}</button>
          <a class="btn" href="#/quiz">${esc(t('quiz.other'))}</a>
          ${epoch ? `<a class="btn" href="#/epoche/${epoch.id}">${esc(t('quiz.toEpoch'))}</a>` : ''}
        </div>
        ${reviewList(r.wrong)}
      </div>
    `;
    el.querySelector('#quiz-again').addEventListener('click', () => renderQuiz(el, mode));
    focusScore(el);
  }

  runSession(el, session, { title, color, back, showEpoch: !epoch, onDone: drawResult, joker: true });
}
