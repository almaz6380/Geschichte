import { DB } from '../data.js';
import { esc, termItem, setTitle, emptyState, bindAnchorScroll } from '../ui.js';
import { setQuery } from '../router.js';
import { normalize } from '../search.js';
import { t, plural, getLang } from '../i18n.js';

// Sprachen mit lateinischer Schrift bekommen die Sprungleiste A–Z; Arabisch, Kyrillisch und
// Devanagari die Anfangszeichen, die tatsächlich vorkommen; Chinesisch und Japanisch keine.
const LATIN = new Set(['de', 'en', 'fr', 'es', 'pt', 'it', 'tr', 'pl']);
const NO_LETTERS = new Set(['zh', 'ja']);

// Anfangsbuchstabe ohne Diakritika, damit É, Ä oder Ç unter E, A und C einsortiert werden.
function letterOf(term) {
  const c = [...term.trim()][0]?.toLocaleUpperCase() || '#';
  if (!LATIN.has(getLang())) return c;
  const base = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /[A-Z]/.test(base) ? base : '#';
}

export function render(el, { id } = {}, { query } = { query: new URLSearchParams() }) {
  setTitle(t('glossary.title'));
  if (!DB.glossary.length) {
    el.innerHTML = `<h1>${esc(t('glossary.title'))}</h1>${emptyState(t('glossary.empty.title'), t('glossary.empty.text'), '#/epochen', t('themes.empty.link'))}`;
    return;
  }
  const q = query?.get('q') || '';
  const epochFilter = query?.get('epoche') || '';

  el.innerHTML = `
    <h1>${esc(t('glossary.title'))}</h1>
    <p class="muted intro-text">${esc(t('glossary.intro', { terms: plural(DB.glossary.length, 'unit.term') }))}</p>
    <div class="search-box">
      <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-search"/></svg>
      <input id="gl-input" type="search" placeholder="${esc(t('glossary.filter'))}" value="${esc(q)}" aria-label="${esc(t('glossary.filter'))}" autocomplete="off">
    </div>
    <div class="chip-scroll" id="gl-epochs"></div>
    <nav class="letter-bar" id="gl-letters" aria-label="${esc(t('glossary.letters'))}"></nav>
    <div class="result-count" id="gl-count"></div>
    <div id="gl-list"></div>
  `;

  const input = el.querySelector('#gl-input');
  const list = el.querySelector('#gl-list');
  const letters = el.querySelector('#gl-letters');
  const count = el.querySelector('#gl-count');
  const epochBox = el.querySelector('#gl-epochs');
  let filter = q;
  let epoch = epochFilter && DB.epochsById.has(epochFilter) ? epochFilter : '';

  function renderEpochChips() {
    const chip = (id, label, color, on) => `<button type="button" class="chip chip-btn" data-id="${esc(id)}" aria-pressed="${on}">${color ? `<span class="dot" style="--chip-color:${color}"></span>` : ''}${esc(label)}</button>`;
    epochBox.innerHTML = chip('', t('glossary.allEpochs'), null, epoch === '') + DB.epochs.map((e) => chip(e.id, e.title, e.color, epoch === e.id)).join('');
  }

  function draw() {
    setQuery({ q: filter || null, epoche: epoch || null });
    // Wie die globale Suche: Umlaute und Akzente spielen keine Rolle ("Pharao" = "Pharaó").
    const f = normalize(filter);
    let items = DB.glossary;
    if (epoch) items = items.filter((g) => g.epochId === epoch);
    if (f) items = items.filter((g) => normalize(g.term).includes(f) || normalize(g.definition).includes(f));
    const groups = new Map();
    for (const g of items) {
      const L = letterOf(g.term);
      if (!groups.has(L)) groups.set(L, []);
      groups.get(L).push(g);
    }
    const present = [...groups.keys()];
    const latin = LATIN.has(getLang());
    const alphabet = latin ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('') : present;
    const anchor = (L) => `gl-${L === '#' ? 'x' : [...L].map((c) => c.codePointAt(0).toString(16)).join('')}`;
    letters.hidden = NO_LETTERS.has(getLang());
    letters.innerHTML = alphabet.map((L) => present.includes(L) ? `<a data-anchor="${anchor(L)}" href="#">${esc(L)}</a>` : `<span>${esc(L)}</span>`).join('');
    count.textContent = plural(items.length, 'unit.term');
    list.innerHTML = present.length
      ? present.map((L) => `<section class="letter-group" id="${anchor(L)}">${NO_LETTERS.has(getLang()) ? '' : `<h2 class="letter">${esc(L)}</h2>`}<div class="term-list">${groups.get(L).map((g) => termItem(g)).join('')}</div></section>`).join('')
      : `<p class="muted">${esc(t('glossary.none'))}</p>`;
  }

  let timer = null;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { filter = input.value; draw(); }, 120); });
  epochBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    epoch = b.dataset.id;
    renderEpochChips();
    draw();
  });
  bindAnchorScroll(el);

  renderEpochChips();
  draw();

  if (id && DB.termsById.has(id)) {
    const target = el.querySelector('#term-' + CSS.escape(id));
    if (target) {
      target.classList.add('term-highlight');
      requestAnimationFrame(() => {
        const top = target.getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top, behavior: 'auto' });
      });
    }
  }
}
