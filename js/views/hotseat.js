import { DB } from '../data.js';
import { esc, setTitle, backLink, progressBar, announce, showToast } from '../ui.js';
import { MIXED, pickQuestions, relocalize } from '../quiz.js';
import { DUEL_COUNT, cleanName } from '../duel.js';
import { createHotseat, current, hsAnswer, hsNext, hsScores, MIN_PLAYERS, MAX_HOTSEAT } from '../hotseat.js';
import { getPlayerName } from '../store.js';
import { bindQuizKeys, setKeyHandler, keyHandler, choicesHtml, difficultyBadge, KEYS } from './quizrunner.js';
import { modeTitle } from './duel.js';
import { t } from '../i18n.js';

// Laufendes Spiel (überlebt einen Sprachwechsel).
let active = null;
let lastNames = null;

export function render(el, params, ctx) {
  const unbind = bindQuizKeys();
  if (ctx?.rerender && active) {
    const qs = relocalize({ questions: active.questions }, new Map(DB.quiz.map((q) => [q.id, q])));
    active.questions = qs.questions;
    draw(el);
  } else {
    active = null;
    renderSetup(el);
  }
  return unbind;
}

function renderSetup(el, names = lastNames || [getPlayerName() || '', '']) {
  setTitle(t('hotseat.title'));
  el.innerHTML = `
    ${backLink('#/quiz', t('quiz.back'))}
    <h1>${esc(t('hotseat.title'))}</h1>
    <p class="muted">${esc(t('hotseat.intro'))}</p>
    <div class="card duel-form">
      <div id="hs-names">${names.map((n, i) => `
        <label class="field"><span>${esc(t('hotseat.player', { n: i + 1 }))}</span>
        <input type="text" maxlength="20" class="hs-name" value="${esc(n)}" placeholder="${esc(t('hotseat.player', { n: i + 1 }))}"></label>`).join('')}
      </div>
      <div class="btn-row">
        ${names.length < MAX_HOTSEAT ? `<button type="button" class="btn btn-small" id="hs-add">${esc(t('hotseat.add'))}</button>` : ''}
        ${names.length > MIN_PLAYERS ? `<button type="button" class="btn btn-small" id="hs-remove">${esc(t('hotseat.remove'))}</button>` : ''}
      </div>
      <label class="field"><span>${esc(t('duel.mode'))}</span>
        <select id="hs-mode">
          <option value="${MIXED}">${esc(t('quiz.mixed.title'))}</option>
          ${DB.epochs.filter((e) => (DB.quizByEpoch.get(e.id)?.length || 0) >= 5).map((e) => `<option value="${e.id}">${esc(e.title)}</option>`).join('')}
        </select></label>
      <button type="button" class="btn btn-primary" id="hs-start">${esc(t('duel.start'))}</button>
    </div>`;
  const values = () => [...el.querySelectorAll('.hs-name')].map((i) => i.value);
  el.querySelector('#hs-add')?.addEventListener('click', () => renderSetup(el, [...values(), '']));
  el.querySelector('#hs-remove')?.addEventListener('click', () => renderSetup(el, values().slice(0, -1)));
  el.querySelector('#hs-start').addEventListener('click', () => {
    const raw = values();
    const names = raw.map((n, i) => cleanName(n) || t('hotseat.player', { n: i + 1 }));
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) { showToast(t('hotseat.duplicate')); return; }
    lastNames = raw;
    const mode = el.querySelector('#hs-mode').value;
    const questions = pickQuestions(DB.quizByEpoch, mode).slice(0, DUEL_COUNT);
    if (!questions.length) { showToast(t('quiz.noQuestions.text')); return; }
    active = { ...createHotseat(names, questions), mode, handoff: false };
    draw(el);
  });
}

function draw(el) {
  const s = active;
  const title = `${t('hotseat.title')}: ${modeTitle(s.mode)}`;
  setTitle(title);
  const back = backLink('#/duell/lokal', t('hotseat.title'));
  if (s.phase === 'done') return drawDone(el, back);
  const { question: q, player } = current(s);
  const n = s.q + 1;
  const total = s.questions.length;
  const head = `<div class="quiz-top"><span>${esc(title)}</span><span>${esc(t('quiz.questionOf', { n, total }))}</span></div>
    ${progressBar(((n - (s.phase === 'reveal' ? 0 : 1)) / total) * 100, t('quiz.questionOf', { n, total }))}`;

  if (s.phase === 'answer' && s.handoff) {
    el.innerHTML = `${back}<div class="quiz-card card hs-handoff">${head}
      <h2>${esc(t('hotseat.handoff', { name: player.name }))}</h2>
      <button type="button" class="btn btn-primary" id="hs-ready">${esc(t('hotseat.ready', { name: player.name }))}</button></div>`;
    const go = () => { s.handoff = false; draw(el); };
    el.querySelector('#hs-ready').addEventListener('click', go);
    el.querySelector('#hs-ready').focus({ preventScroll: true });
    setKeyHandler(keyHandler({ count: 0, onEnter: go }));
    return;
  }

  if (s.phase === 'answer') {
    el.innerHTML = `${back}<div class="quiz-card card">${head}
      <div class="quiz-sub"><span class="hs-turn">${esc(t('hotseat.turn', { name: player.name }))}</span>${difficultyBadge(q)}</div>
      <div class="quiz-question" id="quiz-q">${esc(q.question)}</div>
      ${choicesHtml(q)}</div>`;
    const choose = (i) => {
      hsAnswer(s, i);
      if (s.phase === 'answer') s.handoff = true;
      draw(el);
    };
    el.querySelectorAll('.quiz-choice').forEach((b) => b.addEventListener('click', () => choose(Number(b.dataset.i))));
    el.querySelector('.quiz-choice')?.focus({ preventScroll: true });
    setKeyHandler(keyHandler({ count: q.choices.length, onChoose: choose }));
    return;
  }

  // Auflösung
  el.innerHTML = `${back}<div class="quiz-card card">${head}
    <div class="quiz-question" id="quiz-q">${esc(q.question)}</div>
    ${choicesHtml(q, { reveal: true })}
    <ul class="hs-picks">${s.players.map((p) => {
      const a = p.answers[s.q];
      return `<li class="${a === q.answer ? 'ok' : 'nok'}"><b>${esc(p.name)}</b> ${a === q.answer ? '✓' : '✗'} ${esc(KEYS[a] || '–')}</li>`;
    }).join('')}</ul>
    <div class="quiz-feedback ok"><b>${esc(t('quiz.answerWas', { answer: q.choices[q.answer] }))}</b> ${esc(q.explanation)}</div>
    <div class="quiz-actions"><button type="button" class="btn btn-primary" id="quiz-next">${esc(n === total ? t('quiz.finish') : t('quiz.next'))}</button></div></div>`;
  const go = () => { hsNext(s); s.handoff = false; draw(el); };
  el.querySelector('#quiz-next').addEventListener('click', go);
  el.querySelector('#quiz-next').focus({ preventScroll: true });
  announce(t('quiz.answerWas', { answer: q.choices[q.answer] }));
  setKeyHandler(keyHandler({ count: 0, onEnter: go }));
}

function drawDone(el, back) {
  setKeyHandler(null);
  const rows = hsScores(active);
  const total = active.questions.length;
  const winners = rows.filter((r) => r.correct === rows[0].correct);
  el.innerHTML = `${back}<div class="quiz-card card quiz-result">
    <h1 class="quiz-score">${esc(winners.length > 1 ? t('hotseat.draw') : t('hotseat.winner', { name: winners[0].name }))}</h1>
    <div class="card duel-board"><ol class="duel-rows">${rows.map((r) => `<li><span class="duel-name">${r.correct === rows[0].correct ? '🏆 ' : ''}${esc(r.name)}</span><b>${r.correct}/${total}</b></li>`).join('')}</ol></div>
    <div class="btn-row" style="justify-content:center;margin-top:16px">
      <button type="button" class="btn btn-primary" id="hs-again">${esc(t('quiz.again'))}</button>
      <a class="btn" href="#/quiz">${esc(t('quiz.other'))}</a>
    </div></div>`;
  el.querySelector('#hs-again').addEventListener('click', () => { active = null; renderSetup(el); });
  const h = el.querySelector('.quiz-score');
  h.setAttribute('tabindex', '-1');
  h.focus({ preventScroll: true });
}
