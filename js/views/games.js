// Spiele: Zeitleiste sortieren, Jahr schätzen, Wer bin ich?
import { DB } from '../data.js';
import { roundFinished } from '../ads.js';
import { esc, setTitle, backLink, progressBar, announce, formatRange, formatYear, lifeSpan, showToast } from '../ui.js';
import { pickSortRound, scoreOrder, moveItem, pickYearRound, scoreYearGuess, toYear, pickWhoRound, whoPoints, SORT_ROUNDS, SORT_SIZE, WHO_MAX_HINTS } from '../games.js';
import { saveGameScore, getGameBest } from '../store.js';
import { bindQuizKeys, setKeyHandler, keyHandler, KEYS } from './quizrunner.js';
import { t, plural } from '../i18n.js';

const back = () => backLink('#/quiz', t('quiz.back'));

// Auswahl der Epoche (oder alle) als Pool für die Spiele.
function epochSelect(id, value = '') {
  return `<label class="field"><span>${esc(t('games.pool'))}</span><select id="${id}">
    <option value="">${esc(t('games.pool.all'))}</option>
    ${DB.epochs.map((e) => `<option value="${e.id}" ${e.id === value ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}
  </select></label>`;
}

function intro(el, { title, text, game, onStart }) {
  setTitle(title);
  const best = getGameBest()[game];
  el.innerHTML = `${back()}<h1>${esc(title)}</h1><p class="muted">${esc(text)}</p>
    <div class="card duel-form">
      ${epochSelect('game-pool')}
      ${best ? `<p class="muted">${esc(t('quiz.best'))}: <b>${best.best}</b> · ${esc(plural(best.attempts, 'unit.attempt'))}</p>` : ''}
      <button type="button" class="btn btn-primary" id="game-start">${esc(t('duel.start'))}</button>
    </div>`;
  el.querySelector('#game-start').addEventListener('click', () => {
    const epochId = el.querySelector('#game-pool').value;
    onStart(epochId);
  });
  el.querySelector('#game-start').focus({ preventScroll: true });
}

function poolEvents(epochId) {
  return epochId ? DB.eventsByEpoch.get(epochId) || [] : DB.events;
}

function finish(el, { title, game, score, max, details = '', again }) {
  const saved = saveGameScore(game, score);
  setKeyHandler(null);
  el.innerHTML = `${back()}<div class="quiz-card card quiz-result">
    <div class="muted">${esc(title)}</div>
    <h1 class="quiz-score">${score} / ${max}</h1>
    <div class="muted">${esc(t('quiz.best'))}: ${saved.best} · ${esc(plural(saved.attempts, 'unit.attempt'))}</div>
    <div class="btn-row" style="justify-content:center;margin-top:16px">
      <button type="button" class="btn btn-primary" id="game-again">${esc(t('quiz.again'))}</button>
      <a class="btn" href="#/quiz">${esc(t('quiz.other'))}</a>
    </div>
    ${details}
  </div>`;
  el.querySelector('#game-again').addEventListener('click', again);
  const h = el.querySelector('.quiz-score');
  h.setAttribute('tabindex', '-1');
  h.focus({ preventScroll: true });
  roundFinished();
}

// ---------- Zeitleiste sortieren ----------

export function renderSort(el) {
  const unbind = bindQuizKeys();
  const title = t('sort.title');
  const start = () => intro(el, { title, text: t('sort.intro'), game: 'sort', onStart: (epochId) => playSort(el, epochId, start) });
  start();
  return unbind;
}

function playSort(el, epochId, restart) {
  const title = t('sort.title');
  const pool = poolEvents(epochId);
  const rounds = [];
  for (let i = 0; i < SORT_ROUNDS; i++) {
    const used = new Set(rounds.flatMap((r) => r.solution));
    const r = pickSortRound(pool.filter((e) => !used.has(e.id)), Math.random, SORT_SIZE, epochId ? 2 : 10) || pickSortRound(pool);
    if (r) rounds.push(r);
  }
  if (!rounds.length) { showToast(t('games.tooFew')); return restart(); }
  let idx = 0;
  let score = 0;
  let order = rounds[0].shown.map((e) => e.id);
  let checked = false;
  let selected = null;

  function draw() {
    const r = rounds[idx];
    const total = rounds.length * SORT_SIZE;
    const posOk = (id, i) => r.solution[i] === id;
    el.innerHTML = `${back()}<div class="quiz-card card">
      <div class="quiz-top"><span>${esc(title)}</span><span>${esc(t('sort.round', { n: idx + 1, total: rounds.length }))}</span></div>
      ${progressBar(((idx + (checked ? 1 : 0)) / rounds.length) * 100, t('sort.round', { n: idx + 1, total: rounds.length }))}
      <p class="muted" style="margin-top:12px">${esc(t('sort.task'))}</p>
      <ol class="sort-list">${order.map((id, i) => {
        const ev = DB.eventsById.get(id);
        const cls = checked ? (posOk(id, i) ? 'ok' : 'nok') : (selected === i ? 'selected' : '');
        return `<li class="sort-item ${cls}" data-i="${i}">
          <button type="button" class="sort-pick" data-i="${i}" ${checked ? 'disabled' : ''} aria-pressed="${selected === i}">
            <span class="title">${esc(ev.title)}</span>
            ${checked ? `<span class="sub">${esc(formatRange(ev.year, ev.endYear, ev.approx))}${posOk(id, i) ? '' : ` · ${esc(t('sort.belongs', { n: r.solution.indexOf(id) + 1 }))}`}</span>` : ''}
          </button>
          ${checked ? '' : `<span class="sort-moves">
            <button type="button" class="btn btn-small sort-up" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="${esc(t('sort.up', { title: ev.title }))}">▲</button>
            <button type="button" class="btn btn-small sort-down" data-i="${i}" ${i === order.length - 1 ? 'disabled' : ''} aria-label="${esc(t('sort.down', { title: ev.title }))}">▼</button>
          </span>`}
        </li>`;
      }).join('')}</ol>
      <p class="muted sort-hint">${esc(checked ? t('sort.result', { n: scoreOrder(order, r.solution), total: SORT_SIZE }) : t('sort.hint'))}</p>
      <div class="quiz-actions"><button type="button" class="btn btn-primary" id="sort-check">${esc(checked ? (idx === rounds.length - 1 ? t('quiz.finish') : t('quiz.next')) : t('sort.check'))}</button></div>
    </div>`;
    const move = (from, to) => { order = moveItem(order, from, to); selected = null; draw(); el.querySelector(`.sort-pick[data-i="${Math.max(0, Math.min(order.length - 1, to))}"]`)?.focus({ preventScroll: true }); };
    el.querySelectorAll('.sort-up').forEach((b) => b.addEventListener('click', () => move(Number(b.dataset.i), Number(b.dataset.i) - 1)));
    el.querySelectorAll('.sort-down').forEach((b) => b.addEventListener('click', () => move(Number(b.dataset.i), Number(b.dataset.i) + 1)));
    // Tippen auf zwei Einträge tauscht deren Plätze.
    el.querySelectorAll('.sort-pick').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.i);
      if (selected === null) { selected = i; draw(); el.querySelector(`.sort-pick[data-i="${i}"]`)?.focus({ preventScroll: true }); return; }
      if (selected !== i) { const a = [...order]; [a[selected], a[i]] = [a[i], a[selected]]; order = a; }
      selected = null;
      draw();
      el.querySelector(`.sort-pick[data-i="${i}"]`)?.focus({ preventScroll: true });
    }));
    el.querySelector('#sort-check').addEventListener('click', () => {
      if (!checked) {
        checked = true;
        const pts = scoreOrder(order, r.solution);
        score += pts;
        announce(t('sort.result', { n: pts, total: SORT_SIZE }));
        draw();
        el.querySelector('#sort-check').focus({ preventScroll: true });
        return;
      }
      idx++;
      if (idx >= rounds.length) return finish(el, { title, game: 'sort', score, max: total, again: () => playSort(el, epochId, restart) });
      order = rounds[idx].shown.map((e) => e.id);
      checked = false;
      selected = null;
      draw();
      el.querySelector('.sort-pick')?.focus({ preventScroll: true });
    });
  }
  draw();
  el.querySelector('.sort-pick')?.focus({ preventScroll: true });
}

// ---------- Jahr schätzen ----------

export function renderYear(el) {
  const unbind = bindQuizKeys();
  const title = t('year.game.title');
  const start = () => intro(el, { title, text: t('year.game.intro'), game: 'year', onStart: (epochId) => playYear(el, epochId, start) });
  start();
  return unbind;
}

function playYear(el, epochId, restart) {
  const title = t('year.game.title');
  const events = pickYearRound(poolEvents(epochId));
  if (events.length < 3) { showToast(t('games.tooFew')); return restart(); }
  let idx = 0;
  let score = 0;
  let guess = null;
  const results = [];

  function draw() {
    const ev = events[idx];
    const n = idx + 1;
    const total = events.length;
    const done = guess !== null;
    const pts = done ? scoreYearGuess(guess, ev.year, ev.endYear) : 0;
    el.innerHTML = `${back()}<div class="quiz-card card">
      <div class="quiz-top"><span>${esc(title)}</span><span>${esc(t('quiz.questionOf', { n, total }))}</span></div>
      ${progressBar(((n - (done ? 0 : 1)) / total) * 100, t('quiz.questionOf', { n, total }))}
      <div class="quiz-question" id="quiz-q">${esc(ev.title)}</div>
      <p class="muted">${esc(ev.summary)}</p>
      ${done ? `
        <div class="quiz-feedback ${pts >= 50 ? 'ok' : 'nok'}">
          <b>${esc(t('year.game.points', { points: pts }))}</b>
          ${esc(t('year.game.answer', { guess: formatYear(guess), year: formatRange(ev.year, ev.endYear, ev.approx) }))}
        </div>
        <div class="quiz-actions"><button type="button" class="btn btn-primary" id="quiz-next">${esc(n === total ? t('quiz.finish') : t('quiz.next'))}</button></div>
      ` : `
        <form class="year-form" id="year-form">
          <label class="field"><span>${esc(t('year.game.label'))}</span>
            <input type="number" inputmode="numeric" min="1" step="1" id="year-input" required></label>
          <label class="field"><span>${esc(t('year.game.era'))}</span>
            <select id="year-era"><option value="ad">${esc(t('year.game.ad'))}</option><option value="bc">${esc(t('year.game.bc'))}</option></select></label>
          <button type="submit" class="btn btn-primary">${esc(t('year.game.submit'))}</button>
        </form>`}
    </div>`;
    if (done) {
      const go = () => {
        idx++;
        guess = null;
        if (idx >= events.length) {
          const details = `<ol class="quiz-wrong-list year-list">${results.map((r) => `<li><div class="q">${esc(r.ev.title)}</div><div class="a">${esc(t('year.game.answer', { guess: formatYear(r.guess), year: formatRange(r.ev.year, r.ev.endYear, r.ev.approx) }))} · ${r.pts}</div></li>`).join('')}</ol>`;
          return finish(el, { title, game: 'year', score, max: events.length * 100, details, again: () => playYear(el, epochId, restart) });
        }
        draw();
      };
      el.querySelector('#quiz-next').addEventListener('click', go);
      el.querySelector('#quiz-next').focus({ preventScroll: true });
      setKeyHandler(keyHandler({ count: 0, onEnter: go }));
    } else {
      setKeyHandler(null);
      const input = el.querySelector('#year-input');
      input.focus({ preventScroll: true });
      el.querySelector('#year-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const y = toYear(input.value, el.querySelector('#year-era').value === 'bc');
        if (!Number.isFinite(y)) { input.focus(); return; }
        guess = y;
        const p = scoreYearGuess(y, ev.year, ev.endYear);
        score += p;
        results.push({ ev, guess: y, pts: p });
        announce(t('year.game.points', { points: p }));
        draw();
      });
    }
  }
  draw();
}

// ---------- Wer bin ich? ----------

export function renderWho(el) {
  const unbind = bindQuizKeys();
  const title = t('who.title');
  const start = () => intro(el, { title, text: t('who.intro'), game: 'who', onStart: (epochId) => playWho(el, epochId, start) });
  start();
  return unbind;
}

function hintsFor(p) {
  const epoch = DB.epochsById.get(p.epochId);
  const region = DB.regionsById.get(p.regionId);
  const events = DB.eventsByPerson.get(p.id) || [];
  const list = [
    t('who.hint.role', { role: p.role }),
    t('who.hint.region', { region: region?.name || '–' }),
    t('who.hint.epoch', { epoch: epoch?.title || '–' }),
  ];
  const span = lifeSpan(p);
  if (span) list.push(t('who.hint.life', { span }));
  if (events[0]) list.push(t('who.hint.event', { event: events[0].title }));
  else if (p.tags?.length) list.push(t('who.hint.tags', { tags: p.tags.slice(0, 3).join(', ') }));
  return list.slice(0, WHO_MAX_HINTS);
}

function playWho(el, epochId, restart) {
  const title = t('who.title');
  const persons = epochId ? DB.personsByEpoch.get(epochId) || [] : DB.persons;
  // Ablenker kommen aus allen Personen, damit auch kleine Epochen vier Optionen haben.
  const rounds = pickWhoRound(persons.length >= 4 ? persons : DB.persons).filter((r) => r.options.length === 4);
  if (!rounds.length) { showToast(t('games.tooFew')); return restart(); }
  let idx = 0;
  let score = 0;
  let shown = 1;
  let chosen = null;
  const results = [];

  function draw() {
    const { target, options } = rounds[idx];
    const hints = hintsFor(target);
    const done = chosen !== null;
    const correct = done && options[chosen].id === target.id;
    const n = idx + 1;
    const total = rounds.length;
    el.innerHTML = `${back()}<div class="quiz-card card">
      <div class="quiz-top"><span>${esc(title)}</span><span>${esc(t('quiz.questionOf', { n, total }))}</span></div>
      ${progressBar(((n - (done ? 0 : 1)) / total) * 100, t('quiz.questionOf', { n, total }))}
      <h2 class="quiz-question" id="quiz-q">${esc(t('who.question'))}</h2>
      <ol class="who-hints">${hints.slice(0, done ? hints.length : shown).map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
      ${!done && shown < hints.length ? `<button type="button" class="btn btn-small" id="who-more">${esc(t('who.more', { points: whoPoints(shown + 1, true) }))}</button>` : ''}
      <div class="quiz-choices" role="group" aria-labelledby="quiz-q" style="margin-top:16px">
        ${options.map((p, i) => {
          let cls = 'quiz-choice';
          if (done && p.id === target.id) cls += ' correct';
          else if (done && i === chosen) cls += ' wrong';
          return `<button type="button" class="${cls}" data-i="${i}" ${done ? 'disabled' : ''}><span class="key">${KEYS[i]}</span><span>${esc(p.name)}</span></button>`;
        }).join('')}
      </div>
      ${done ? `
        <div class="quiz-feedback ${correct ? 'ok' : 'nok'}">
          <b>${esc(correct ? t('who.right', { points: whoPoints(shown, true) }) : t('who.wrongAnswer', { name: target.name }))}</b>
          ${esc(target.summary || '')} <a href="#/person/${target.id}">${esc(t('who.profile'))}</a>
        </div>
        <div class="quiz-actions"><button type="button" class="btn btn-primary" id="quiz-next">${esc(n === total ? t('quiz.finish') : t('quiz.next'))}</button></div>` : ''}
    </div>`;
    const choose = (i) => {
      chosen = i;
      const ok = options[i].id === target.id;
      const pts = whoPoints(shown, ok);
      score += pts;
      results.push({ target, ok, pts });
      announce(ok ? t('who.right', { points: pts }) : t('who.wrongAnswer', { name: target.name }));
      draw();
    };
    const go = () => {
      idx++;
      shown = 1;
      chosen = null;
      if (idx >= rounds.length) {
        const details = `<ol class="quiz-wrong-list">${results.map((r) => `<li><div class="q"><a href="#/person/${r.target.id}">${esc(r.target.name)}</a></div><div class="a">${r.ok ? '✓' : '✗'} ${r.pts}</div></li>`).join('')}</ol>`;
        return finish(el, { title, game: 'who', score, max: rounds.length * WHO_MAX_HINTS, details, again: () => playWho(el, epochId, restart) });
      }
      draw();
    };
    el.querySelector('#who-more')?.addEventListener('click', () => { shown++; draw(); el.querySelector('#who-more, .quiz-choice')?.focus({ preventScroll: true }); });
    el.querySelectorAll('.quiz-choice').forEach((b) => b.addEventListener('click', () => choose(Number(b.dataset.i))));
    el.querySelector('#quiz-next')?.addEventListener('click', go);
    (el.querySelector('#quiz-next') || el.querySelector('.quiz-choice'))?.focus({ preventScroll: true });
    setKeyHandler(keyHandler({ count: done ? 0 : options.length, onChoose: done ? null : choose, onEnter: done ? go : null }));
  }
  draw();
}
