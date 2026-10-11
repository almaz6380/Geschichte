import { DB } from '../data.js';
import { esc, setTitle, backLink } from '../ui.js';
import { evaluate, relocalize } from '../quiz.js';
import { dateKey, dailySession, recordDaily, currentStreak, playedToday, shareText, EMPTY_DAILY, DAILY_COUNT } from '../daily.js';
import { getDaily, setDaily, updateWrongIds } from '../store.js';
import { share, appLink } from '../share.js';
import { runSession, bindQuizKeys, reviewList, focusScore } from './quizrunner.js';
import { t, plural } from '../i18n.js';

let active = null;

export function render(el, params, ctx) {
  const unbind = bindQuizKeys();
  const today = dateKey();
  if (ctx?.rerender && active?.today === today) {
    active.session = relocalize(active.session, new Map(DB.quiz.map((q) => [q.id, q])));
    play(el);
  } else {
    active = null;
    renderStart(el, today);
  }
  return unbind;
}

const getState = () => getDaily() || EMPTY_DAILY();

function resultsOf(code) { return [...(code || '')].map((c) => c === '1'); }

function renderStart(el, today) {
  setTitle(t('daily.title'));
  const state = getState();
  const streak = currentStreak(state, today);
  const done = playedToday(state, today);
  const results = resultsOf(state.history[today]);
  el.innerHTML = `
    ${backLink('#/quiz', t('quiz.back'))}
    <h1>${esc(t('daily.title'))}</h1>
    <p class="muted">${esc(t('daily.intro', { questions: plural(DAILY_COUNT, 'unit.question') }))}</p>
    <div class="card daily-card">
      <div class="stats-row">
        <div class="stat"><b>🔥 ${streak}</b><span>${esc(t('daily.streak'))}</span></div>
        <div class="stat"><b>${state.best}</b><span>${esc(t('daily.bestStreak'))}</span></div>
        <div class="stat"><b>${Object.keys(state.history).length}</b><span>${esc(t('daily.days'))}</span></div>
      </div>
      ${calendar(state, today)}
      ${done ? `
        <p><b>${esc(t('daily.doneToday'))}</b> ${results.map((r) => (r ? '🟩' : '🟥')).join('')}</p>
        <div class="btn-row" style="margin-bottom:0"><button type="button" class="btn btn-primary" id="daily-share">${esc(t('daily.share'))}</button></div>
      ` : `<button type="button" class="btn btn-primary" id="daily-start">${esc(t('daily.start'))}</button>`}
    </div>`;
  el.querySelector('#daily-start')?.addEventListener('click', () => {
    active = { today, session: dailySession(DB.quizByEpoch, today), saved: false };
    play(el);
  });
  el.querySelector('#daily-share')?.addEventListener('click', () => doShare(today, results, streak));
}

// Die letzten 28 Tage als kleines Raster.
function calendar(state, today) {
  const [y, m, d] = today.split('-').map(Number);
  const cells = [];
  for (let i = 27; i >= 0; i--) {
    const key = dateKey(new Date(y, m - 1, d - i));
    const code = state.history[key];
    const cls = code === undefined ? '' : (code.split('').filter((c) => c === '1').length >= Math.ceil(code.length / 2) ? 'good' : 'played');
    cells.push(`<i class="${cls}" title="${esc(key)}${code ? ` · ${code.split('').filter((c) => c === '1').length}/${code.length}` : ''}"></i>`);
  }
  return `<div class="daily-cal" aria-hidden="true">${cells.join('')}</div>`;
}

function doShare(today, results, streak) {
  share({ title: t('daily.title'), text: shareText(t('app.name'), today, results, streak), url: appLink('#/taeglich') });
}

function play(el) {
  const { session, today } = active;
  const title = t('daily.title');
  const back = backLink('#/taeglich', title);
  setTitle(title);
  runSession(el, session, {
    title, back, showEpoch: true,
    onDone: () => {
      const r = evaluate(session);
      const results = session.questions.map((q, i) => session.answers[i] === q.answer);
      if (!active?.saved) {
        setDaily(recordDaily(getState(), today, results));
        updateWrongIds(r.wrong.map((w) => w.question.id), session.questions.filter((q, i) => results[i]).map((q) => q.id));
        if (active) active.saved = true;
      }
      const state = getState();
      const streak = currentStreak(state, today);
      el.innerHTML = `
        ${back}
        <div class="quiz-card card quiz-result">
          <div class="muted">${esc(title)} · ${esc(today)}</div>
          <h1 class="quiz-score">${r.correct} / ${r.total}</h1>
          <div class="daily-grid">${results.map((x) => (x ? '🟩' : '🟥')).join('')}</div>
          <div class="quiz-percent">🔥 ${esc(t('daily.streakValue', { days: plural(streak, 'unit.day') }))}</div>
          <div class="btn-row" style="justify-content:center;margin-top:16px">
            <button type="button" class="btn btn-primary" id="daily-share">${esc(t('daily.share'))}</button>
            <a class="btn" href="#/quiz">${esc(t('quiz.other'))}</a>
          </div>
          <p class="muted">${esc(t('daily.tomorrow'))}</p>
          ${reviewList(r.wrong)}
        </div>`;
      el.querySelector('#daily-share').addEventListener('click', () => doShare(today, results, streak));
      focusScore(el);
    },
  });
}
