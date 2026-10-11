import { DB } from '../data.js';
import { esc, setTitle, backLink, showToast } from '../ui.js';
import { MIXED, relocalize, evaluate } from '../quiz.js';
import { newDuel, duelSession, encodeDuel, decodeDuel, addPlayer, mergeDuels, standings, cleanName, MAX_PLAYERS } from '../duel.js';
import { getDuels, saveDuelEntry, getPlayerName, setPlayerName } from '../store.js';
import { setQuery } from '../router.js';
import { share, appLink } from '../share.js';
import { runSession, bindQuizKeys, reviewList, focusScore } from './quizrunner.js';
import { t, plural } from '../i18n.js';

// Laufende Duellrunde, damit ein Sprachwechsel sie nicht verwirft.
let active = null;

const byId = () => new Map(DB.quiz.map((q) => [q.id, q]));

export function modeTitle(mode) {
  if (mode === MIXED) return t('quiz.mixed.title');
  return DB.epochsById.get(mode)?.title || mode;
}

function storedDuel(seed) {
  const entry = getDuels().find((d) => d.seed === seed);
  return entry ? decodeDuel(entry.code) : null;
}

function remember(duel, session) {
  const code = encodeDuel(duel);
  saveDuelEntry({
    seed: duel.seed, code, mode: duel.mode, at: new Date().toISOString(),
    players: standings(duel, session).map((p) => ({ name: p.name, correct: p.correct })),
  });
  return code;
}

export function render(el, params, ctx) {
  const unbind = bindQuizKeys();
  const code = ctx?.query?.get('d');
  if (ctx?.rerender && active) {
    active.session = relocalize(active.session, byId());
    play(el, active.duel, active.session);
  } else if (code) {
    active = null;
    renderBoard(el, code);
  } else {
    active = null;
    renderStart(el);
  }
  return unbind;
}

function nameField(id = 'duel-name') {
  return `<label class="field"><span>${esc(t('duel.name'))}</span>
    <input type="text" id="${id}" maxlength="20" autocomplete="nickname" value="${esc(getPlayerName())}" placeholder="${esc(t('duel.name.placeholder'))}"></label>`;
}

function readName(el) {
  const name = cleanName(el.querySelector('#duel-name')?.value);
  if (!name) { showToast(t('duel.name.missing')); el.querySelector('#duel-name')?.focus(); return null; }
  setPlayerName(name);
  return name;
}

function renderStart(el) {
  setTitle(t('duel.title'));
  const history = getDuels();
  el.innerHTML = `
    ${backLink('#/quiz', t('quiz.back'))}
    <h1>${esc(t('duel.title'))}</h1>
    <p class="muted">${esc(t('duel.intro'))}</p>
    <div class="card duel-form">
      ${nameField()}
      <label class="field"><span>${esc(t('duel.mode'))}</span>
        <select id="duel-mode">
          <option value="${MIXED}">${esc(t('quiz.mixed.title'))}</option>
          ${DB.epochs.filter((e) => (DB.quizByEpoch.get(e.id)?.length || 0) >= 5).map((e) => `<option value="${e.id}">${esc(e.title)}</option>`).join('')}
        </select></label>
      <div class="btn-row" style="margin-bottom:0">
        <button type="button" class="btn btn-primary" id="duel-start">${esc(t('duel.start'))}</button>
        <a class="btn" href="#/duell/lokal">${esc(t('hotseat.title'))}</a>
      </div>
    </div>
    ${history.length ? `
    <section class="section">
      <h2>${esc(t('duel.history'))}</h2>
      <div class="list">${history.map((d) => `
        <a class="list-item" href="#/duell?d=${encodeURIComponent(d.code)}">
          <span class="year">${esc(new Date(d.at).toLocaleDateString())}</span>
          <span><span class="title">${esc(modeTitle(d.mode))}</span>
          <div class="sub">${d.players.map((p) => `${esc(p.name)} ${p.correct}`).join(' · ')}</div></span>
        </a>`).join('')}
      </div>
    </section>` : ''}
  `;
  el.querySelector('#duel-start').addEventListener('click', () => {
    const name = readName(el);
    if (!name) return;
    const duel = newDuel(DB.quizByEpoch, el.querySelector('#duel-mode').value);
    const session = duelSession(duel, byId());
    if (!session) { showToast(t('quiz.noQuestions.text')); return; }
    active = { duel, session, name };
    play(el, duel, session);
  });
}

function renderBoard(el, code) {
  setTitle(t('duel.title'));
  let duel = decodeDuel(code);
  if (!duel) {
    el.innerHTML = `${backLink('#/duell', t('duel.title'))}<div class="empty card"><h2>${esc(t('duel.invalid.title'))}</h2><p>${esc(t('duel.invalid.text'))}</p><a class="btn btn-primary" href="#/duell">${esc(t('duel.new'))}</a></div>`;
    return;
  }
  const known = storedDuel(duel.seed);
  if (known) duel = mergeDuels(known, duel);
  const session = duelSession(duel, byId());
  if (!session) {
    el.innerHTML = `${backLink('#/duell', t('duel.title'))}<div class="empty card"><h2>${esc(t('duel.outdated.title'))}</h2><p>${esc(t('duel.outdated.text'))}</p></div>`;
    return;
  }
  const me = getPlayerName();
  const played = me && duel.players.some((p) => p.name.toLowerCase() === me.toLowerCase());
  if (played) remember(duel, session);
  const full = duel.players.length >= MAX_PLAYERS;
  const challenger = duel.players[0]?.name;

  el.innerHTML = `
    ${backLink('#/duell', t('duel.title'))}
    <h1>${esc(played ? t('duel.board') : t('duel.challenge', { name: challenger || '?' }))}</h1>
    <p class="muted">${esc(modeTitle(duel.mode))} · ${esc(plural(session.questions.length, 'unit.question'))}</p>
    ${boardHtml(duel, session, me)}
    ${played ? shareBox() : full ? '' : `
      <div class="card duel-form">
        ${nameField()}
        <button type="button" class="btn btn-primary" id="duel-join">${esc(t('duel.join'))}</button>
      </div>`}
  `;
  el.querySelector('#duel-join')?.addEventListener('click', () => {
    const name = readName(el);
    if (!name) return;
    active = { duel, session, name };
    play(el, duel, session);
  });
  bindShare(el, duel);
}

function boardHtml(duel, session, me) {
  const rows = standings(duel, session);
  const total = session.questions.length;
  const top = rows[0]?.correct;
  return `<div class="card duel-board"><ol class="duel-rows">
    ${rows.map((p) => `<li class="${me && p.name.toLowerCase() === me.toLowerCase() ? 'me' : ''}">
      <span class="duel-name">${p.correct === top && rows.length > 1 ? '🏆 ' : ''}${esc(p.name)}</span>
      <span class="duel-dots" aria-hidden="true">${session.questions.map((q, i) => `<i class="${p.answers[i] === q.answer ? 'ok' : 'nok'}"></i>`).join('')}</span>
      <b>${p.correct}/${total}</b>
    </li>`).join('')}
  </ol></div>`;
}

function shareBox() {
  return `<div class="btn-row" style="margin-top:16px">
    <button type="button" class="btn btn-primary" id="duel-share">${esc(t('duel.share'))}</button>
    <a class="btn" href="#/duell">${esc(t('duel.new'))}</a>
  </div>
  <p class="muted">${esc(t('duel.share.hint'))}</p>`;
}

function bindShare(el, duel) {
  el.querySelector('#duel-share')?.addEventListener('click', () => {
    const code = encodeDuel(duel);
    const me = getPlayerName();
    const mine = standings(duel, duelSession(duel, byId())).find((p) => p.name === me);
    share({
      title: t('duel.title'),
      text: t('duel.share.text', { name: me || '?', score: mine ? `${mine.correct}/${duel.ids.length}` : '', mode: modeTitle(duel.mode) }),
      url: appLink(`#/duell?d=${code}`),
    });
  });
}

function play(el, duel, session) {
  const title = `${t('duel.title')}: ${modeTitle(duel.mode)}`;
  const back = backLink('#/duell', t('duel.title'));
  setTitle(title);
  runSession(el, session, {
    title, back, showEpoch: duel.mode === MIXED,
    color: DB.epochsById.get(duel.mode)?.color,
    onDone: () => {
      const { name } = active || {};
      const result = addPlayer(duel, name || getPlayerName() || '?', session.answers);
      const code = remember(result, session);
      active = null;
      setQuery({ d: code });
      const r = evaluate(session);
      el.innerHTML = `
        ${back}
        <div class="quiz-card card quiz-result">
          <div class="muted">${esc(title)}</div>
          <h1 class="quiz-score">${r.correct} / ${r.total}</h1>
          ${boardHtml(result, session, name)}
          ${shareBox()}
          ${reviewList(r.wrong)}
        </div>`;
      bindShare(el, result);
      focusScore(el);
    },
  });
}
