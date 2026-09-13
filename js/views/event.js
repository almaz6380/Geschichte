import { DB } from '../data.js';
import { esc, formatRange, regionChip, epochChip, themeChip, personCard, termItem, tagChips, bookmarkButton, setTitle, backLink, sectionHead } from '../ui.js';
import { render as notFound } from './notfound.js';

export function render(el, { id }) {
  const ev = DB.eventsById.get(id);
  if (!ev) return notFound(el, {}, { message: 'Dieses Ereignis gibt es nicht.' });
  setTitle(ev.title);
  const epoch = DB.epochsById.get(ev.epochId);
  const persons = (ev.personIds || []).map((pid) => DB.personsById.get(pid)).filter(Boolean);
  const themes = DB.themesByEvent.get(ev.id) || [];
  const terms = DB.glossary.filter((g) => (g.related || []).includes(ev.id));
  const i = DB.eventsSorted.indexOf(ev);
  const prev = DB.eventsSorted[i - 1];
  const next = DB.eventsSorted[i + 1];
  const impLabel = ['', 'Ereignis', 'Wichtiges Ereignis', 'Meilenstein'][ev.importance];
  const sameEpoch = (DB.eventsByEpoch.get(ev.epochId) || []).filter((x) => x.id !== ev.id);
  const nearby = sameEpoch
    .map((x) => ({ x, d: Math.abs(x.year - ev.year) }))
    .sort((a, b) => a.d - b.d).slice(0, 4).map((o) => o.x).sort((a, b) => a.year - b.year);

  el.innerHTML = `
    ${backLink(`#/epoche/${ev.epochId}`, epoch?.title || 'Epoche')}
    <div class="eyebrow" style="--epoch-color:${epoch?.color}"><span class="dot"></span>${esc(impLabel)} · ${esc(formatRange(ev.year, ev.endYear, ev.approx))}</div>
    <h1>${esc(ev.title)}</h1>
    <div class="meta-row">
      ${regionChip(ev.regionId)}
      ${epochChip(ev.epochId)}
      <span class="chip" title="Bedeutung">${'★'.repeat(ev.importance)}${'☆'.repeat(3 - ev.importance)}</span>
      <span style="margin-left:auto">${bookmarkButton('event', ev.id)}</span>
    </div>
    <article class="article">
      <p class="lead">${esc(ev.summary)}</p>
      <p>${esc(ev.text)}</p>
      ${tagChips(ev.tags)}
    </article>
    ${persons.length ? `<section class="section">${sectionHead('Beteiligte Personen')}<div class="person-grid">${persons.map(personCard).join('')}</div></section>` : ''}
    ${terms.length ? `<section class="section">${sectionHead('Begriffe zum Ereignis')}<div class="term-list">${terms.map((g) => termItem(g)).join('')}</div></section>` : ''}
    ${themes.length ? `<section class="section">${sectionHead('Querschnittsthemen')}<div class="chip-row">${themes.map(themeChip).join('')}</div></section>` : ''}
    ${nearby.length ? `<section class="section">${sectionHead('Zur gleichen Zeit in dieser Epoche')}<div class="chip-row">${nearby.map((x) => `<a class="chip" href="#/ereignis/${x.id}"><b>${esc(formatRange(x.year, null, x.approx))}</b>&nbsp;${esc(x.title)}</a>`).join('')}</div></section>` : ''}
    <nav class="pager" aria-label="Chronologische Nachbarn">
      ${prev ? `<a href="#/ereignis/${prev.id}"><span class="lbl">Davor · ${esc(formatRange(prev.year, null, prev.approx))}</span><span>${esc(prev.title)}</span></a>` : '<span></span>'}
      ${next ? `<a class="next" href="#/ereignis/${next.id}"><span class="lbl">Danach · ${esc(formatRange(next.year, null, next.approx))}</span><span>${esc(next.title)}</span></a>` : '<span></span>'}
    </nav>
  `;
}
