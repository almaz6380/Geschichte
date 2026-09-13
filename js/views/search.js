import { DB } from '../data.js';
import { esc, formatRange, lifeSpan, epochRange, setTitle, plural } from '../ui.js';
import { buildIndex, search, makeSnippet } from '../search.js';
import { setQuery } from '../router.js';

let index = null;

const TYPE_LABEL = { epoch: 'Epoche', event: 'Ereignis', person: 'Person', term: 'Begriff', theme: 'Thema' };
const TYPE_ORDER = ['epoch', 'theme', 'event', 'person', 'term'];

function href(doc) {
  switch (doc.type) {
    case 'epoch': return `#/epoche/${doc.id}`;
    case 'event': return `#/ereignis/${doc.id}`;
    case 'person': return `#/person/${doc.id}`;
    case 'term': return `#/glossar/${doc.id}`;
    case 'theme': return `#/thema/${doc.id}`;
    default: return '#/';
  }
}

function subline(doc) {
  if (doc.type === 'epoch') return epochRange(DB.epochsById.get(doc.id));
  if (doc.type === 'event') { const ev = DB.eventsById.get(doc.id); return [formatRange(ev.year, ev.endYear, ev.approx), DB.epochsById.get(ev.epochId)?.title].filter(Boolean).join(' · '); }
  if (doc.type === 'person') { const p = DB.personsById.get(doc.id); return [lifeSpan(p), p.role].filter(Boolean).join(' · '); }
  if (doc.type === 'term') { const g = DB.termsById.get(doc.id); return g.epochId ? DB.epochsById.get(g.epochId)?.title || '' : 'Glossar'; }
  if (doc.type === 'theme') return 'Querschnittsthema';
  return '';
}

export function render(el, params, { query }) {
  setTitle('Suche');
  if (!index) index = buildIndex(DB);
  const q = query.get('q') || '';
  let typeFilter = '';

  el.innerHTML = `
    <h1>Suche</h1>
    <div class="search-box">
      <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-search"/></svg>
      <input id="search-input" type="search" placeholder="Ereignis, Person, Epoche, Thema oder Begriff …" value="${esc(q)}" autocomplete="off" aria-label="Suchbegriff" enterkeyhint="search">
    </div>
    <div class="chip-scroll" id="search-types"></div>
    <div id="search-results"></div>
  `;

  const input = el.querySelector('#search-input');
  const out = el.querySelector('#search-results');
  const types = el.querySelector('#search-types');
  let timer = null;
  let lastResults = [];

  function renderTypes() {
    const counts = {};
    for (const r of lastResults) counts[r.doc.type] = (counts[r.doc.type] || 0) + 1;
    const chip = (id, label, on) => `<button type="button" class="chip chip-btn" data-id="${id}" aria-pressed="${on}">${esc(label)}</button>`;
    types.innerHTML = lastResults.length
      ? chip('', `Alle (${lastResults.length})`, typeFilter === '') + TYPE_ORDER.filter((t) => counts[t]).map((t) => chip(t, `${TYPE_LABEL[t]} (${counts[t]})`, typeFilter === t)).join('')
      : '';
  }

  function renderResults(t) {
    const shown = typeFilter ? lastResults.filter((r) => r.doc.type === typeFilter) : lastResults;
    out.innerHTML = `<p class="result-count">${plural(shown.length, 'Treffer', 'Treffer')} für „${esc(t)}“</p>
      <div class="list">${shown.map(({ doc, tokens }) => `
        <a class="list-item list-item-single" href="${href(doc)}">
          <span>
            <span class="badge badge-${doc.type}">${TYPE_LABEL[doc.type]}</span>
            <span class="title" style="margin-left:6px">${esc(doc.title)}</span>
            <div class="sub">${esc(subline(doc))}</div>
            <div class="sub">${makeSnippet(doc.snippetSrc, tokens, esc)}</div>
          </span>
        </a>`).join('')}</div>`;
  }

  const run = (term) => {
    const t = term.trim();
    setQuery({ q: t || null });
    if (t.length < 2) {
      lastResults = []; renderTypes();
      out.innerHTML = `<p class="muted">Gib mindestens zwei Zeichen ein. Beispiele:
        <a href="#/suche?q=Napoleon">Napoleon</a>, <a href="#/suche?q=Revolution">Revolution</a>, <a href="#/suche?q=China">China</a>, <a href="#/suche?q=Demokratie">Demokratie</a>, <a href="#/suche?q=Mauer">Mauer</a>.</p>`;
      return;
    }
    lastResults = search(index, t, 80);
    typeFilter = '';
    renderTypes();
    if (!lastResults.length) {
      out.innerHTML = `<p class="result-count">Keine Treffer für „${esc(t)}“.</p>`;
      return;
    }
    renderResults(t);
  };

  types.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    typeFilter = b.dataset.id;
    renderTypes();
    renderResults(input.value.trim());
  });
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => run(input.value), 150); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(timer); run(input.value); } });
  run(q);
  if (!q) input.focus();
}
