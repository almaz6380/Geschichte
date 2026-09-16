import { DB } from '../data.js';
import { esc, setTitle, backLink } from '../ui.js';
import { MIXED, MIXED_COUNT, EPOCH_COUNT, pickQuestions, createSession, answer, next, isFinished, evaluate, grade } from '../quiz.js';
import { getQuizProgress, saveQuizResult, resetQuizProgress } from '../store.js';
import { render as notFound } from './notfound.js';
import { t, plural } from '../i18n.js';

const KEYS = ['A', 'B', 'C', 'D'];

export function render(el, { slug }, ctx) {
  if (!slug) return renderModes(el);
  if (slug !== MIXED && !DB.epochsById.has(slug)) return notFound(el, {}, { message: t('quiz.notfound') });
  return renderQuiz(el, slug);
}

function renderModes(el) {
  setTitle(t('nav.quiz'));
  const progress = getQuizProgress();
  const mixed = progress[MIXED];
  const mastered = DB.epochs.filter((e) => progress[e.id] && progress[e.id].best / progress[e.id].total >= 0.8).length;

  el.innerHTML = `
    <h1>${esc(t('nav.quiz'))}</h1>
    <p class="muted">${esc(t('quiz.intro'))}</p>
    <div class="card" style="margin-bottom:16px">
      <div class="muted">${esc(t('quiz.mastered.label'))}</div>
      <h3>${esc(t('quiz.mastered.value', { done: mastered, total: DB.epochs.length }))}</h3>
      <div class="progress"><span style="width:${Math.round((mastered / Math.max(1, DB.epochs.length)) * 100)}%"></span></div>
    </div>
    <div class="card-grid">
      <a class="card card-link quiz-mode-card" href="#/quiz/${MIXED}" style="--epoch-color:var(--accent)">
        <h3>${esc(t('quiz.mixed.title'))}</h3>
        <span class="muted">${esc(t('quiz.mixed.sub', { questions: plural(MIXED_COUNT, 'unit.question') }))}</span>
        <span class="best">${mixed ? `${esc(t('quiz.best'))} <b>${mixed.best}/${mixed.total}</b> · ${esc(plural(mixed.attempts, 'unit.attempt'))}` : esc(t('quiz.notPlayed'))}</span>
      </a>
      ${DB.epochs.map((e) => {
        const n = DB.quizByEpoch.get(e.id)?.length || 0;
        const p = progress[e.id];
        return `<a class="card card-link quiz-mode-card" href="#/quiz/${e.id}" style="--epoch-color:${e.color}">
          <h3>${esc(e.title)}</h3>
          <span class="muted">${esc(t('quiz.epoch.sub', { shown: Math.min(n, EPOCH_COUNT), total: n }))}</span>
          <span class="best">${p ? `${esc(t('quiz.best'))} <b>${p.best}/${p.total}</b> · ${esc(plural(p.attempts, 'unit.attempt'))}` : esc(t('quiz.notPlayed'))}</span>
        </a>`;
      }).join('')}
    </div>
    <div class="btn-row" style="margin-top:24px"><button type="button" class="btn btn-small" id="quiz-reset">${esc(t('quiz.reset'))}</button></div>
  `;
  el.querySelector('#quiz-reset').addEventListener('click', () => {
    if (confirm(t('quiz.reset.confirm'))) { resetQuizProgress(); renderModes(el); }
  });
}

function renderQuiz(el, mode) {
  const epoch = mode === MIXED ? null : DB.epochsById.get(mode);
  const title = epoch ? t('quiz.epochTitle', { epoch: epoch.title }) : t('quiz.mixed.title');
  setTitle(title);
  const questions = pickQuestions(DB.quizByEpoch, mode);
  if (!questions.length) {
    el.innerHTML = `${backLink('#/quiz', t('quiz.back'))}<div class="empty card"><h2>${esc(t('quiz.noQuestions.title'))}</h2><p>${esc(t('quiz.noQuestions.text'))}</p></div>`;
    return;
  }
  const session = createSession(questions);
  let saved = null;

  function draw() {
    if (isFinished(session)) return drawResult();
    const q = session.questions[session.index];
    const chosen = session.answers[session.index];
    const answered = chosen !== undefined;
    const n = session.index + 1;
    const total = session.questions.length;
    const qEpoch = DB.epochsById.get(q.epochId);

    el.innerHTML = `
      ${backLink('#/quiz', t('quiz.back'))}
      <div class="quiz-card card" style="--epoch-color:${epoch?.color || 'var(--accent)'}">
        <div class="quiz-top"><span>${esc(title)}</span><span>${esc(t('quiz.questionOf', { n, total }))}</span></div>
        <div class="progress" aria-hidden="true"><span style="width:${Math.round(((n - (answered ? 0 : 1)) / total) * 100)}%"></span></div>
        <div class="quiz-sub">${mode === MIXED && qEpoch ? `<span class="muted">${esc(qEpoch.title)}</span>` : '<span></span>'}<span class="badge diff-${q.difficulty}">${esc(t(['', 'quiz.difficulty.easy', 'quiz.difficulty.medium', 'quiz.difficulty.hard'][q.difficulty] || 'quiz.difficulty.medium'))}</span></div>
        <div class="quiz-question" id="quiz-q">${esc(q.question)}</div>
        <div class="quiz-choices" role="group" aria-labelledby="quiz-q">
          ${q.choices.map((c, i) => {
            let cls = 'quiz-choice';
            if (answered && i === q.answer) cls += ' correct';
            else if (answered && i === chosen) cls += ' wrong';
            return `<button type="button" class="${cls}" data-i="${i}" ${answered ? 'disabled' : ''}><span class="key">${KEYS[i]}</span><span>${esc(c)}</span></button>`;
          }).join('')}
        </div>
        ${answered ? `
          <div class="quiz-feedback ${chosen === q.answer ? 'ok' : 'nok'}">
            <b>${chosen === q.answer ? esc(t('quiz.correct')) : esc(t('quiz.wrong', { answer: q.choices[q.answer] }))}</b>
            ${esc(q.explanation)}
          </div>
          <div class="quiz-actions"><button type="button" class="btn btn-primary" id="quiz-next">${esc(n === total ? t('quiz.finish') : t('quiz.next'))}</button></div>
        ` : ''}
      </div>
    `;
    el.querySelectorAll('.quiz-choice').forEach((b) => b.addEventListener('click', () => { answer(session, Number(b.dataset.i)); draw(); }));
    el.querySelector('#quiz-next')?.addEventListener('click', () => { next(session); draw(); });
    (el.querySelector('#quiz-next') || el.querySelector('.quiz-choice'))?.focus({ preventScroll: true });
  }

  function drawResult() {
    const r = evaluate(session);
    if (!saved) saved = saveQuizResult(mode, r.correct, r.total);
    el.innerHTML = `
      ${backLink('#/quiz', t('quiz.back'))}
      <div class="quiz-card card quiz-result" style="--epoch-color:${epoch?.color || 'var(--accent)'}">
        <div class="muted">${esc(title)}</div>
        <div class="quiz-score">${r.correct} / ${r.total}</div>
        <div class="quiz-percent">${esc(t('quiz.percentCorrect', { percent: r.percent }))} · ${esc(grade(r.percent))}</div>
        <div class="muted">${esc(t('quiz.best'))}: ${saved.best}/${saved.total} · ${esc(plural(saved.attempts, 'unit.attempt'))}</div>
        <div class="btn-row" style="justify-content:center;margin-top:16px">
          <button type="button" class="btn btn-primary" id="quiz-again">${esc(t('quiz.again'))}</button>
          <a class="btn" href="#/quiz">${esc(t('quiz.other'))}</a>
          ${epoch ? `<a class="btn" href="#/epoche/${epoch.id}">${esc(t('quiz.toEpoch'))}</a>` : ''}
        </div>
        ${r.wrong.length ? `
        <div class="quiz-wrong-list">
          <h3>${esc(t('quiz.review'))}</h3>
          <ol>${r.wrong.map(({ question: q }) => `<li><div class="q">${esc(q.question)}</div><div class="a">${esc(t('quiz.answerWas', { answer: q.choices[q.answer] }))} ${esc(q.explanation)}</div></li>`).join('')}</ol>
        </div>` : `<p style="margin-top:16px">${esc(t('quiz.allCorrect'))}</p>`}
      </div>
    `;
    el.querySelector('#quiz-again').addEventListener('click', () => renderQuiz(el, mode));
  }

  draw();
}
