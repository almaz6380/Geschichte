import { DB } from '../data.js';
import { esc, formatRange, lifeSpan, epochRange, setTitle } from '../ui.js';
import { buildIndex, search, makeSnippet } from '../search.js';
import { setQuery } from '../router.js';

let index = null;

const TYPE_LABEL = { epoch: 'Epoche', event: 'Ereignis', person: 'Person' };

function href(doc) {
  return doc.type === 'epoch' ? `#/epoche/${doc.id}` : doc.type === 'event' ? `#/ereignis/${doc.id}` : `#/person/${doc.id}`;
}

function subline(doc) {
  if (doc.type === 'epoch') return epochRange(DB.epochsById.get(doc.id));
  if (doc.type === 'event') { const ev = DB.eventsById.get(doc.id); return formatRange(ev.year, ev.endYear, ev.approx); }
  const p = DB.personsById.get(doc.id);
  return [lifeSpan(p), p.role].filter(Boolean).join(' · ');
}

export function render(el, params, { query }) {
  setTitle('Suche');
  if (!index) index = buildIndex(DB);
  const q = query.get('q') || '';

  el.innerHTML = `
    <h1>Suche</h1>
    <div class="search-box">
      <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-search"/></svg>
      <input id="search-input" type="search" placeholder="Ereignis, Person, Epoche oder Begriff …" value="${esc(q)}" autocomplete="off" aria-label="Suchbegriff" enterkeyhint="search">
    </div>
    <div id="search-results"></div>
  `;

  const input = el.querySelector('#search-input');
  const out = el.querySelector('#search-results');
  let timer = null;

  const run = (term) => {
    const t = term.trim();
    setQuery({ q: t || null });
    if (t.length < 2) {
      out.innerHTML = `<p class="muted">Gib mindestens zwei Zeichen ein. Beispiele:
        <a href="#/suche?q=Napoleon">Napoleon</a>, <a href="#/suche?q=Revolution">Revolution</a>, <a href="#/suche?q=China">China</a>, <a href="#/suche?q=Mauer">Mauer</a>.</p>`;
      return;
    }
    const results = search(index, t, 60);
    if (!results.length) {
      out.innerHTML = `<p class="result-count">Keine Treffer für „${esc(t)}“.</p>`;
      return;
    }
    out.innerHTML = `<p class="result-count">${results.length} Treffer für „${esc(t)}“</p>
      <div class="list">${results.map(({ doc, tokens }) => `
        <a class="list-item" href="${href(doc)}" style="grid-template-columns:1fr">
          <span>
            <span class="badge badge-${doc.type}">${TYPE_LABEL[doc.type]}</span>
            <span class="title" style="margin-left:6px">${esc(doc.title)}</span>
            <div class="sub">${esc(subline(doc))}</div>
            <div class="sub">${makeSnippet(doc.snippetSrc, tokens, esc)}</div>
          </span>
        </a>`).join('')}</div>`;
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => run(input.value), 150);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(timer); run(input.value); } });
  run(q);
  if (!q) input.focus();
}
