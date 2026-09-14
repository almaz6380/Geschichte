import { DB } from '../data.js';
import { esc, termItem, setTitle, emptyState, bindAnchorScroll } from '../ui.js';
import { setQuery } from '../router.js';
import { plural } from '../i18n.js';

function letterOf(term) {
  const c = term.trim().charAt(0).toUpperCase();
  const map = { Ä: 'A', Ö: 'O', Ü: 'U' };
  return map[c] || (/[A-Z]/.test(c) ? c : '#');
}

export function render(el, { id } = {}, { query } = { query: new URLSearchParams() }) {
  setTitle('Glossar');
  if (!DB.glossary.length) {
    el.innerHTML = `<h1>Glossar</h1>${emptyState('Noch keine Begriffe', 'Das Glossar wird gerade vorbereitet.', '#/epochen', 'Zu den Epochen')}`;
    return;
  }
  const q = query?.get('q') || '';
  const epochFilter = query?.get('epoche') || '';

  el.innerHTML = `
    <h1>Glossar</h1>
    <p class="muted intro-text">${plural(DB.glossary.length, 'unit.term')} aus allen Epochen, alphabetisch geordnet und kurz erklärt.</p>
    <div class="search-box">
      <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-search"/></svg>
      <input id="gl-input" type="search" placeholder="Begriff filtern …" value="${esc(q)}" aria-label="Begriff filtern" autocomplete="off">
    </div>
    <div class="chip-scroll" id="gl-epochs"></div>
    <nav class="letter-bar" id="gl-letters" aria-label="Buchstaben"></nav>
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
    epochBox.innerHTML = chip('', 'Alle Epochen', null, epoch === '') + DB.epochs.map((e) => chip(e.id, e.title, e.color, epoch === e.id)).join('');
  }

  function draw() {
    setQuery({ q: filter || null, epoche: epoch || null });
    const f = filter.trim().toLowerCase();
    let items = DB.glossary;
    if (epoch) items = items.filter((g) => g.epochId === epoch);
    if (f) items = items.filter((g) => g.term.toLowerCase().includes(f) || g.definition.toLowerCase().includes(f));
    const groups = new Map();
    for (const g of items) {
      const L = letterOf(g.term);
      if (!groups.has(L)) groups.set(L, []);
      groups.get(L).push(g);
    }
    const present = [...groups.keys()];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');
    letters.innerHTML = alphabet.map((L) => present.includes(L) ? `<a data-anchor="gl-${L === '#' ? 'x' : L}" href="#">${L}</a>` : `<span>${L}</span>`).join('');
    count.textContent = plural(items.length, 'unit.term');
    list.innerHTML = present.length
      ? present.map((L) => `<section class="letter-group" id="gl-${L === '#' ? 'x' : L}"><h2 class="letter">${L}</h2><div class="term-list">${groups.get(L).map((g) => termItem(g)).join('')}</div></section>`).join('')
      : `<p class="muted">Keine Begriffe gefunden.</p>`;
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
