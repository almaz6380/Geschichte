// Karteikarten (Leitner-System) für Begriffe und Personen.
import { DB } from '../data.js';
import { esc, setTitle, backLink, progressBar, announce, lifeSpan } from '../ui.js';
import { dueCards, rate, boxCounts, dueCount, today, BOXES } from '../cards.js';
import { getCards, setCards } from '../store.js';
import { bindQuizKeys, setKeyHandler } from './quizrunner.js';
import { t } from '../i18n.js';

const DECKS = {
  terms: {
    title: () => t('cards.deck.terms'),
    items: (epochId) => (epochId ? DB.termsByEpoch.get(epochId) || [] : DB.glossary),
    get: (id) => DB.termsById.get(id),
    front: (g) => `<div class="flash-front">${esc(g.term)}</div>`,
    back: (g) => `<p>${esc(g.definition)}</p><a href="#/glossar/${g.id}">${esc(t('cards.open'))}</a>`,
  },
  persons: {
    title: () => t('cards.deck.persons'),
    items: (epochId) => (epochId ? DB.personsByEpoch.get(epochId) || [] : DB.persons),
    get: (id) => DB.personsById.get(id),
    front: (p) => `<div class="flash-front">${esc(p.name)}</div>`,
    back: (p) => `<p><b>${esc(p.role)}</b>${lifeSpan(p) ? ` · ${esc(lifeSpan(p))}` : ''}</p><p>${esc(p.summary || '')}</p><a href="#/person/${p.id}">${esc(t('cards.open'))}</a>`,
  },
};

let filter = '';

export function render(el) {
  const unbind = bindQuizKeys();
  renderDecks(el);
  return unbind;
}

function renderDecks(el) {
  setTitle(t('cards.title'));
  setKeyHandler(null);
  const day = today();
  el.innerHTML = `
    ${backLink('#/quiz', t('quiz.back'))}
    <h1>${esc(t('cards.title'))}</h1>
    <p class="muted">${esc(t('cards.intro'))}</p>
    <label class="field"><span>${esc(t('games.pool'))}</span><select id="cards-pool">
      <option value="">${esc(t('games.pool.all'))}</option>
      ${DB.epochs.map((e) => `<option value="${e.id}" ${e.id === filter ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}
    </select></label>
    <div class="card-grid">${Object.entries(DECKS).map(([key, deck]) => {
      const ids = deck.items(filter).map((x) => x.id);
      const state = getCards(key);
      const counts = boxCounts(ids, state);
      const learned = ids.length - counts[0];
      return `<div class="card deck-card">
        <h3>${esc(deck.title())}</h3>
        <p class="muted">${esc(t('cards.stats', { learned, total: ids.length, due: dueCount(ids, state, day) }))}</p>
        <div class="deck-boxes" aria-label="${esc(t('cards.boxes'))}">${counts.slice(1).map((c, i) => `<span title="${esc(t('cards.box', { n: i + 1 }))}"><b>${c}</b><small>${i + 1}</small></span>`).join('')}</div>
        ${progressBar(ids.length ? (counts[BOXES] / ids.length) * 100 : 0, t('cards.mastered'))}
        <button type="button" class="btn btn-primary deck-start" data-deck="${key}" ${ids.length ? '' : 'disabled'}>${esc(t('cards.learn'))}</button>
      </div>`;
    }).join('')}</div>`;
  el.querySelector('#cards-pool').addEventListener('change', (e) => { filter = e.target.value; renderDecks(el); });
  el.querySelectorAll('.deck-start').forEach((b) => b.addEventListener('click', () => learn(el, b.dataset.deck)));
}

function learn(el, key) {
  const deck = DECKS[key];
  const day = today();
  const ids = deck.items(filter).map((x) => x.id);
  const queue = dueCards(ids, getCards(key), day);
  const back = backLink('#/karten', t('cards.title'));
  if (!queue.length) {
    el.innerHTML = `${back}<div class="empty card"><h2>${esc(t('cards.none.title'))}</h2><p>${esc(t('cards.none.text'))}</p></div>`;
    return;
  }
  let idx = 0;
  let flipped = false;
  let known = 0;

  function draw() {
    if (idx >= queue.length) {
      setKeyHandler(null);
      el.innerHTML = `${back}<div class="quiz-card card quiz-result">
        <div class="muted">${esc(deck.title())}</div>
        <h1 class="quiz-score">${known} / ${queue.length}</h1>
        <p class="muted">${esc(t('cards.done'))}</p>
        <div class="btn-row" style="justify-content:center"><a class="btn btn-primary" href="#/karten">${esc(t('cards.title'))}</a></div></div>`;
      const h = el.querySelector('.quiz-score');
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
      return;
    }
    const item = deck.get(queue[idx]);
    const box = getCards(key)[item.id]?.box || 0;
    el.innerHTML = `${back}<div class="quiz-card card flashcard">
      <div class="quiz-top"><span>${esc(deck.title())}</span><span>${esc(t('cards.progress', { n: idx + 1, total: queue.length }))}</span></div>
      ${progressBar((idx / queue.length) * 100, t('cards.progress', { n: idx + 1, total: queue.length }))}
      <div class="muted flash-box">${esc(box ? t('cards.box', { n: box }) : t('cards.new'))}</div>
      ${deck.front(item)}
      ${flipped ? `<div class="flash-back">${deck.back(item)}</div>
        <div class="btn-row flash-rate">
          <button type="button" class="btn" id="card-no">${esc(t('cards.no'))}</button>
          <button type="button" class="btn btn-primary" id="card-yes">${esc(t('cards.yes'))}</button>
        </div>` : `<div class="btn-row flash-rate"><button type="button" class="btn btn-primary" id="card-flip">${esc(t('cards.flip'))}</button></div>`}
    </div>`;
    const flip = () => { flipped = true; draw(); el.querySelector('#card-yes')?.focus({ preventScroll: true }); };
    const grade = (ok) => {
      setCards(key, rate(getCards(key), item.id, ok, day));
      if (ok) known++;
      announce(ok ? t('cards.yes') : t('cards.no'));
      idx++;
      flipped = false;
      draw();
      el.querySelector('#card-flip, .quiz-score')?.focus({ preventScroll: true });
    };
    el.querySelector('#card-flip')?.addEventListener('click', flip);
    el.querySelector('#card-yes')?.addEventListener('click', () => grade(true));
    el.querySelector('#card-no')?.addEventListener('click', () => grade(false));
    setKeyHandler((e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, select, textarea, a')) return;
      if (!flipped && (e.key === ' ' || e.key === 'Enter') && !e.target.closest?.('button')) { e.preventDefault(); flip(); }
      else if (flipped && (e.key === 'j' || e.key === 'ArrowRight')) { e.preventDefault(); grade(true); }
      else if (flipped && (e.key === 'n' || e.key === 'ArrowLeft')) { e.preventDefault(); grade(false); }
    });
  }
  draw();
  el.querySelector('#card-flip')?.focus({ preventScroll: true });
}
