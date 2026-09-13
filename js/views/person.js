import { DB } from '../data.js';
import { esc, lifeSpan, regionChip, epochChip, eventItem, bookmarkButton, setTitle, backLink } from '../ui.js';
import { render as notFound } from './notfound.js';

export function render(el, { id }) {
  const p = DB.personsById.get(id);
  if (!p) return notFound(el, {}, { message: 'Diese Person gibt es nicht.' });
  setTitle(p.name);
  const epoch = DB.epochsById.get(p.epochId);
  const events = DB.eventsByPerson.get(p.id) || [];

  el.innerHTML = `
    ${backLink(`#/epoche/${p.epochId}`, epoch?.title || 'Epoche')}
    <h1>${esc(p.name)}</h1>
    <p class="muted" style="margin-top:-8px">${esc(p.role)}</p>
    <div class="meta-row">
      ${lifeSpan(p) ? `<span class="chip" style="--chip-color:${epoch?.color}"><span class="dot"></span>${esc(lifeSpan(p))}</span>` : ''}
      ${regionChip(p.regionId)}
      ${epochChip(p.epochId)}
      <span style="margin-left:auto">${bookmarkButton('person', p.id)}</span>
    </div>
    <article class="article">
      <p><strong>${esc(p.summary)}</strong></p>
      <p>${esc(p.text)}</p>
      <div class="chip-row">${(p.tags || []).map((t) => `<a class="chip" href="#/suche?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div>
    </article>
    ${events.length ? `<section class="section"><h2>Verknüpfte Ereignisse</h2><div class="list">${events.map((ev) => eventItem(ev)).join('')}</div></section>` : ''}
  `;
}
