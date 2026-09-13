import { DB } from '../data.js';
import { esc, formatRange, regionChip, epochChip, personItem, bookmarkButton, setTitle, backLink } from '../ui.js';
import { render as notFound } from './notfound.js';

export function render(el, { id }) {
  const ev = DB.eventsById.get(id);
  if (!ev) return notFound(el, {}, { message: 'Dieses Ereignis gibt es nicht.' });
  setTitle(ev.title);
  const epoch = DB.epochsById.get(ev.epochId);
  const persons = (ev.personIds || []).map((pid) => DB.personsById.get(pid)).filter(Boolean);
  const i = DB.eventsSorted.indexOf(ev);
  const prev = DB.eventsSorted[i - 1];
  const next = DB.eventsSorted[i + 1];
  const stars = '★'.repeat(ev.importance) + '☆'.repeat(3 - ev.importance);

  el.innerHTML = `
    ${backLink(`#/epoche/${ev.epochId}`, epoch?.title || 'Epoche')}
    <h1>${esc(ev.title)}</h1>
    <div class="meta-row">
      <span class="chip" style="--chip-color:${epoch?.color}"><span class="dot"></span>${esc(formatRange(ev.year, ev.endYear, ev.approx))}</span>
      ${regionChip(ev.regionId)}
      ${epochChip(ev.epochId)}
      <span class="chip" title="Bedeutung">${stars}</span>
      <span style="margin-left:auto">${bookmarkButton('event', ev.id)}</span>
    </div>
    <article class="article">
      <p><strong>${esc(ev.summary)}</strong></p>
      <p>${esc(ev.text)}</p>
      <div class="chip-row">${(ev.tags || []).map((t) => `<a class="chip" href="#/suche?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div>
    </article>
    ${persons.length ? `<section class="section"><h2>Beteiligte Personen</h2><div class="list">${persons.map(personItem).join('')}</div></section>` : ''}
    <nav class="pager" aria-label="Chronologische Nachbarn">
      ${prev ? `<a href="#/ereignis/${prev.id}"><span class="lbl">Davor · ${esc(formatRange(prev.year, null, prev.approx))}</span><span>${esc(prev.title)}</span></a>` : '<span></span>'}
      ${next ? `<a class="next" href="#/ereignis/${next.id}"><span class="lbl">Danach · ${esc(formatRange(next.year, null, next.approx))}</span><span>${esc(next.title)}</span></a>` : '<span></span>'}
    </nav>
  `;
}
