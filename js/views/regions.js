import { DB } from '../data.js';
import { esc, regionTile, eventItem, personCard, setTitle, backLink, sectionHead, epochRange, bindAnchorScroll } from '../ui.js';
import { render as notFound } from './notfound.js';
import { t, plural } from '../i18n.js';

export function renderList(el) {
  setTitle(t('regions.title'));
  el.innerHTML = `
    <h1>${esc(t('regions.title'))}</h1>
    <p class="muted intro-text">${esc(t('regions.intro'))}</p>
    <div class="card-grid">${DB.regions.map(regionTile).join('')}</div>
  `;
}

export function renderDetail(el, { id }) {
  const r = DB.regionsById.get(id);
  if (!r) return notFound(el, {}, { message: t('regions.notfound') });
  setTitle(r.name);
  const events = DB.eventsByRegion.get(r.id) || [];
  const persons = (DB.personsByRegion.get(r.id) || []).slice().sort((a, b) => (a.born ?? 0) - (b.born ?? 0));
  const epochs = DB.epochs.filter((e) => events.some((ev) => ev.epochId === e.id));

  el.innerHTML = `
    ${backLink('#/regionen', t('regions.back'))}
    <header class="hero" style="--epoch-color:${r.color}">
      <div class="hero-range">${esc(t('unit.region.one'))} · ${plural(events.length, 'unit.event')} · ${plural(persons.length, 'unit.person')}</div>
      <h1>${esc(r.name)}</h1>
      <div class="btn-row"><a class="btn" href="#/zeitleiste?region=${r.id}">${esc(t('epoch.timeline'))}</a></div>
    </header>
    <nav class="toc" aria-label="${esc(t('epoch.toc.title'))}">
      ${epochs.map((e) => `<a data-anchor="re-${e.id}" href="#">${esc(e.title)}</a>`).join('')}
      ${persons.length ? `<a data-anchor="re-personen" href="#">${esc(t('heading.persons'))}</a>` : ''}
    </nav>
    ${epochs.map((e) => `
      <section class="section group" id="re-${e.id}" style="--epoch-color:${e.color}">
        ${sectionHead(e.title, null, `<span class="muted">${esc(epochRange(e))}</span>`)}
        <div class="list">${events.filter((ev) => ev.epochId === e.id).map((ev) => eventItem(ev)).join('')}</div>
      </section>`).join('')}
    ${persons.length ? `<section class="section" id="re-personen">${sectionHead(t('regions.persons.title'))}<div class="person-grid">${persons.map(personCard).join('')}</div></section>` : ''}
  `;
  bindAnchorScroll(el);
}
