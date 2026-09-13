import { DB } from '../data.js';
import { esc, setTitle, backLink } from '../ui.js';
import { MIXED, MIXED_COUNT, EPOCH_COUNT, pickQuestions, createSession, answer, next, isFinished, evaluate, grade } from '../quiz.js';
import { getQuizProgress, saveQuizResult, resetQuizProgress } from '../store.js';
import { render as notFound } from './notfound.js';

const KEYS = ['A', 'B', 'C', 'D'];

export function render(el, { slug }, ctx) {
  if (!slug) return renderModes(el);
  if (slug !== MIXED && !DB.epochsById.has(slug)) return notFound(el, {}, { message: 'Dieses Quiz gibt es nicht.' });
  return renderQuiz(el, slug);
}

function renderModes(el) {
  setTitle('Quiz');
  const progress = getQuizProgress();
  const mixed = progress[MIXED];
  const mastered = DB.epochs.filter((e) => progress[e.id] && progress[e.id].best / progress[e.id].total >= 0.8).length;

  el.innerHTML = `
    <h1>Quiz</h1>
    <p class="muted">Teste dein Wissen: pro Epoche oder gemischt durch die ganze Weltgeschichte. Dein Bestwert wird auf diesem Gerät gespeichert.</p>
    <div class="card" style="margin-bottom:16px">
      <div class="muted">Gemeisterte Epochen (≥ 80 %)</div>
      <h3>${mastered} von ${DB.epochs.length}</h3>
      <div class="progress"><span style="width:${Math.round((mastered / Math.max(1, DB.epochs.length)) * 100)}%"></span></div>
    </div>
    <div class="card-grid">
      <a class="card card-link quiz-mode-card" href="#/quiz/${MIXED}" style="--epoch-color:var(--accent)">
        <h3>Gemischtes Quiz</h3>
        <span class="muted">${MIXED_COUNT} Fragen aus allen Epochen</span>
        <span class="best">${mixed ? `Bestwert <b>${mixed.best}/${mixed.total}</b> · ${mixed.attempts} ${mixed.attempts === 1 ? 'Versuch' : 'Versuche'}` : 'Noch nicht gespielt'}</span>
      </a>
      ${DB.epochs.map((e) => {
        const n = DB.quizByEpoch.get(e.id)?.length || 0;
        const p = progress[e.id];
        return `<a class="card card-link quiz-mode-card" href="#/quiz/${e.id}" style="--epoch-color:${e.color}">
          <h3>${esc(e.title)}</h3>
          <span class="muted">${Math.min(n, EPOCH_COUNT)} von ${n} Fragen pro Runde</span>
          <span class="best">${p ? `Bestwert <b>${p.best}/${p.total}</b> · ${p.attempts} ${p.attempts === 1 ? 'Versuch' : 'Versuche'}` : 'Noch nicht gespielt'}</span>
        </a>`;
      }).join('')}
    </div>
    <div class="btn-row" style="margin-top:24px"><button type="button" class="btn btn-small" id="quiz-reset">Fortschritt zurücksetzen</button></div>
  `;
  el.querySelector('#quiz-reset').addEventListener('click', () => {
    if (confirm('Quiz-Fortschritt wirklich löschen?')) { resetQuizProgress(); renderModes(el); }
  });
}

function renderQuiz(el, mode) {
  const epoch = mode === MIXED ? null : DB.epochsById.get(mode);
  const title = epoch ? `Quiz: ${epoch.title}` : 'Gemischtes Quiz';
  setTitle(title);
  const questions = pickQuestions(DB.quizByEpoch, mode);
  if (!questions.length) {
    el.innerHTML = `${backLink('#/quiz', 'Quiz-Übersicht')}<div class="empty card"><h2>Keine Fragen</h2><p>Für diese Epoche gibt es noch keine Fragen.</p></div>`;
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
      ${backLink('#/quiz', 'Quiz-Übersicht')}
      <div class="quiz-card card" style="--epoch-color:${epoch?.color || 'var(--accent)'}">
        <div class="quiz-top"><span>${esc(title)}</span><span>Frage ${n} von ${total}</span></div>
        <div class="progress" aria-hidden="true"><span style="width:${Math.round(((n - (answered ? 0 : 1)) / total) * 100)}%"></span></div>
        <div class="quiz-sub">${mode === MIXED && qEpoch ? `<span class="muted">${esc(qEpoch.title)}</span>` : '<span></span>'}<span class="badge diff-${q.difficulty}">${['', 'Leicht', 'Mittel', 'Schwer'][q.difficulty]}</span></div>
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
            <b>${chosen === q.answer ? 'Richtig!' : `Leider falsch. Richtig wäre: ${esc(q.choices[q.answer])}`}</b>
            ${esc(q.explanation)}
          </div>
          <div class="quiz-actions"><button type="button" class="btn btn-primary" id="quiz-next">${n === total ? 'Auswertung' : 'Weiter'}</button></div>
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
      ${backLink('#/quiz', 'Quiz-Übersicht')}
      <div class="quiz-card card quiz-result" style="--epoch-color:${epoch?.color || 'var(--accent)'}">
        <div class="muted">${esc(title)}</div>
        <div class="quiz-score">${r.correct} / ${r.total}</div>
        <div class="quiz-percent">${r.percent} % richtig · ${esc(grade(r.percent))}</div>
        <div class="muted">Bestwert: ${saved.best}/${saved.total} · ${saved.attempts} ${saved.attempts === 1 ? 'Versuch' : 'Versuche'}</div>
        <div class="btn-row" style="justify-content:center;margin-top:16px">
          <button type="button" class="btn btn-primary" id="quiz-again">Nochmal</button>
          <a class="btn" href="#/quiz">Anderes Quiz</a>
          ${epoch ? `<a class="btn" href="#/epoche/${epoch.id}">Zur Epoche</a>` : ''}
        </div>
        ${r.wrong.length ? `
        <div class="quiz-wrong-list">
          <h3>Zum Nachlesen</h3>
          <ol>${r.wrong.map(({ question: q }) => `<li><div class="q">${esc(q.question)}</div><div class="a">Richtig: ${esc(q.choices[q.answer])} – ${esc(q.explanation)}</div></li>`).join('')}</ol>
        </div>` : '<p style="margin-top:16px">Alle Fragen richtig – hervorragend!</p>'}
      </div>
    `;
    el.querySelector('#quiz-again').addEventListener('click', () => renderQuiz(el, mode));
  }

  draw();
}
