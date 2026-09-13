import { DB } from '../data.js';
import { esc, lifeSpan, regionChip, epochChip, themeChip, eventItem, termItem, tagChips, bookmarkButton, setTitle, backLink, sectionHead } from '../ui.js';
import { render as notFound } from './notfound.js';

export function render(el, { id }) {
  const p = DB.personsById.get(id);
  if (!p) return notFound(el, {}, { message: 'Diese Person gibt es nicht.' });
  setTitle(p.name);
  const epoch = DB.epochsById.get(p.epochId);
  const events = DB.eventsByPerson.get(p.id) || [];
  const themes = DB.themesByPerson.get(p.id) || [];
  const terms = DB.glossary.filter((g) => (g.related || []).includes(p.id));
  const contemporaries = (DB.personsByEpoch.get(p.epochId) || []).filter((x) => x.id !== p.id).slice(0, 6);
  const initials = p.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  el.innerHTML = `
    ${backLink(`#/epoche/${p.epochId}`, epoch?.title || 'Epoche')}
    <div class="person-head" style="--epoch-color:${epoch?.color}">
      <span class="avatar avatar-lg" aria-hidden="true">${esc(initials)}</span>
      <div>
        <div class="eyebrow"><span class="dot"></span>${esc(p.role)}</div>
        <h1>${esc(p.name)}</h1>
        ${lifeSpan(p) ? `<div class="muted">${esc(lifeSpan(p))}</div>` : ''}
      </div>
    </div>
    <div class="meta-row">
      ${regionChip(p.regionId)}
      ${epochChip(p.epochId)}
      <span style="margin-left:auto">${bookmarkButton('person', p.id)}</span>
    </div>
    <article class="article">
      <p class="lead">${esc(p.summary)}</p>
      <p>${esc(p.text)}</p>
      ${tagChips(p.tags)}
    </article>
    ${events.length ? `<section class="section">${sectionHead('Verknüpfte Ereignisse')}<div class="list">${events.map((ev) => eventItem(ev)).join('')}</div></section>` : ''}
    ${terms.length ? `<section class="section">${sectionHead('Begriffe')}<div class="term-list">${terms.map((g) => termItem(g)).join('')}</div></section>` : ''}
    ${themes.length ? `<section class="section">${sectionHead('Querschnittsthemen')}<div class="chip-row">${themes.map(themeChip).join('')}</div></section>` : ''}
    ${contemporaries.length ? `<section class="section">${sectionHead('Zeitgenossen')}<div class="chip-row">${contemporaries.map((x) => `<a class="chip" href="#/person/${x.id}">${esc(x.name)}</a>`).join('')}</div></section>` : ''}
  `;
}
