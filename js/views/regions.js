import { DB } from '../data.js';
import { esc, regionTile, eventItem, personCard, setTitle, backLink, sectionHead, epochRange, bindAnchorScroll } from '../ui.js';
import { render as notFound } from './notfound.js';
import { plural } from '../i18n.js';

export function renderList(el) {
  setTitle('Regionen');
  el.innerHTML = `
    <h1>Regionen</h1>
    <p class="muted intro-text">Geschichte nach Kontinenten: Welche Ereignisse und Personen prägten die einzelnen Weltregionen?</p>
    <div class="card-grid">${DB.regions.map(regionTile).join('')}</div>
  `;
}

export function renderDetail(el, { id }) {
  const r = DB.regionsById.get(id);
  if (!r) return notFound(el, {}, { message: 'Diese Region gibt es nicht.' });
  setTitle(r.name);
  const events = DB.eventsByRegion.get(r.id) || [];
  const persons = (DB.personsByRegion.get(r.id) || []).slice().sort((a, b) => (a.born ?? 0) - (b.born ?? 0));
  const epochs = DB.epochs.filter((e) => events.some((ev) => ev.epochId === e.id));

  el.innerHTML = `
    ${backLink('#/regionen', 'Alle Regionen')}
    <header class="hero" style="--epoch-color:${r.color}">
      <div class="hero-range">Region · ${plural(events.length, 'unit.event')} · ${plural(persons.length, 'unit.person')}</div>
      <h1>${esc(r.name)}</h1>
      <div class="btn-row"><a class="btn" href="#/zeitleiste?region=${r.id}">In der Zeitleiste</a></div>
    </header>
    <nav class="toc" aria-label="Inhalt">
      ${epochs.map((e) => `<a data-anchor="re-${e.id}" href="#">${esc(e.title)}</a>`).join('')}
      ${persons.length ? '<a data-anchor="re-personen" href="#">Personen</a>' : ''}
    </nav>
    ${epochs.map((e) => `
      <section class="section group" id="re-${e.id}" style="--epoch-color:${e.color}">
        ${sectionHead(e.title, null, `<span class="muted">${esc(epochRange(e))}</span>`)}
        <div class="list">${events.filter((ev) => ev.epochId === e.id).map((ev) => eventItem(ev)).join('')}</div>
      </section>`).join('')}
    ${persons.length ? `<section class="section" id="re-personen">${sectionHead('Personen aus dieser Region')}<div class="person-grid">${persons.map(personCard).join('')}</div></section>` : ''}
  `;
  bindAnchorScroll(el);
}
