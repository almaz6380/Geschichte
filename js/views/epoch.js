import { DB } from '../data.js';
import { esc, epochRange, eventItem, personItem, bookmarkButton, regionChip, setTitle, backLink } from '../ui.js';
import { render as notFound } from './notfound.js';
import { getQuizProgress } from '../store.js';

export function render(el, { slug }) {
  const e = DB.epochsById.get(slug);
  if (!e) return notFound(el, {}, { message: 'Diese Epoche gibt es nicht.' });
  setTitle(e.title);
  const events = DB.eventsByEpoch.get(e.id) || [];
  const persons = DB.personsByEpoch.get(e.id) || [];
  const quizCount = DB.quizByEpoch.get(e.id)?.length || 0;
  const prog = getQuizProgress()[e.id];
  const idx = DB.epochs.findIndex((x) => x.id === e.id);
  const prev = DB.epochs[idx - 1];
  const next = DB.epochs[idx + 1];

  el.innerHTML = `
    ${backLink('#/epochen', 'Alle Epochen')}
    <header class="hero" style="--epoch-color:${e.color}">
      <div class="hero-range">Epoche ${idx + 1} · ${esc(epochRange(e))}</div>
      <h1>${esc(e.title)}</h1>
      <p>${esc(e.summary)}</p>
      <div class="btn-row">
        ${quizCount ? `<a class="btn" href="#/quiz/${e.id}">Quiz (${quizCount} Fragen${prog ? `, Bestwert ${prog.best}/${prog.total}` : ''})</a>` : ''}
        <a class="btn" href="#/zeitleiste?epoche=${e.id}">In der Zeitleiste</a>
      </div>
    </header>
    <div class="meta-row">
      ${e.regions.map(regionChip).join('')}
      <span style="margin-left:auto">${bookmarkButton('epoch', e.id)}</span>
    </div>

    <article class="article">
      <h2 id="ueberblick">Überblick</h2>
      ${e.overview.map((p) => `<p>${esc(p)}</p>`).join('')}
    </article>

    <section class="section">
      <div class="section-head"><h2>Schlüsselereignisse</h2><span class="muted">${events.length}</span></div>
      <div class="list">${events.map((ev) => eventItem(ev)).join('')}</div>
    </section>

    ${persons.length ? `
    <section class="section">
      <div class="section-head"><h2>Wichtige Personen</h2><span class="muted">${persons.length}</span></div>
      <div class="list">${persons.map(personItem).join('')}</div>
    </section>` : ''}

    <section class="section article">
      <h2>Folgen und Bedeutung</h2>
      <ul class="consequences">${e.consequences.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      <div class="chip-row">${e.tags.map((t) => `<a class="chip" href="#/suche?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div>
    </section>

    <nav class="pager" aria-label="Benachbarte Epochen">
      ${prev ? `<a href="#/epoche/${prev.id}"><span class="lbl">Vorherige Epoche</span><span>${esc(prev.title)}</span></a>` : '<span></span>'}
      ${next ? `<a class="next" href="#/epoche/${next.id}"><span class="lbl">Nächste Epoche</span><span>${esc(next.title)}</span></a>` : '<span></span>'}
    </nav>
  `;
}
