import { DB } from '../data.js';
import { esc, formatRange, epochRange, regionChip, setTitle } from '../ui.js';
import { setQuery } from '../router.js';
import { getTimelineFilters, setTimelineFilters } from '../store.js';

export function render(el, params, { query }) {
  setTitle('Zeitleiste');
  const remembered = getTimelineFilters();
  let epochFilter = query.has('epoche') ? query.get('epoche') : remembered.epoch || '';
  let regionFilter = query.has('region') ? query.get('region') : remembered.region || '';
  if (epochFilter && !DB.epochsById.has(epochFilter)) epochFilter = '';
  if (regionFilter && !DB.regionsById.has(regionFilter)) regionFilter = '';

  el.innerHTML = `
    <h1>Zeitleiste</h1>
    <p class="muted">Alle Ereignisse in chronologischer Reihenfolge, gruppiert nach Epoche. Große Punkte markieren Meilensteine.</p>
    <div class="tl-filters">
      <div class="chip-scroll" id="tl-epoch-filter" role="group" aria-label="Nach Epoche filtern"></div>
      <div class="chip-scroll" id="tl-region-filter" role="group" aria-label="Nach Region filtern"></div>
      <div class="result-count" id="tl-count"></div>
    </div>
    <div class="timeline" id="tl"></div>
    <a class="btn to-top" href="#/zeitleiste" id="tl-top" hidden>↑ Nach oben</a>
  `;

  const epochBox = el.querySelector('#tl-epoch-filter');
  const regionBox = el.querySelector('#tl-region-filter');
  const tl = el.querySelector('#tl');
  const count = el.querySelector('#tl-count');

  const chip = (id, label, color, pressed) =>
    `<button type="button" class="chip chip-btn" data-id="${esc(id)}" aria-pressed="${pressed}">${color ? `<span class="dot" style="--chip-color:${color}"></span>` : ''}${esc(label)}</button>`;

  function renderFilters() {
    epochBox.innerHTML = chip('', 'Alle Epochen', null, epochFilter === '') +
      DB.epochs.map((e) => chip(e.id, e.title, e.color, epochFilter === e.id)).join('');
    regionBox.innerHTML = chip('', 'Alle Regionen', null, regionFilter === '') +
      DB.regions.map((r) => chip(r.id, r.name, r.color, regionFilter === r.id)).join('');
  }

  function renderTimeline() {
    const epochs = epochFilter ? [DB.epochsById.get(epochFilter)] : DB.epochs;
    let total = 0;
    const html = epochs.map((e) => {
      let events = DB.eventsByEpoch.get(e.id) || [];
      if (regionFilter) events = events.filter((ev) => ev.regionId === regionFilter);
      if (!events.length) return '';
      total += events.length;
      let lastYear = null;
      const items = events.map((ev) => {
        let gap = '';
        if (lastYear !== null && ev.year - lastYear >= 500) gap = `<div class="tl-gap">… ${(ev.year - lastYear).toLocaleString('de-DE')} Jahre später</div>`;
        lastYear = ev.year;
        return `${gap}<a class="tl-event imp-${ev.importance}" href="#/ereignis/${ev.id}">
          <span class="tl-year">${esc(formatRange(ev.year, ev.endYear, ev.approx))}</span>
          <span class="tl-title">${esc(ev.title)}</span>
          <div class="tl-sum">${esc(ev.summary)}</div>
          <div class="tl-meta">${regionChip(ev.regionId)}</div>
        </a>`;
      }).join('');
      return `<section class="tl-epoch" id="tl-${e.id}" style="--epoch-color:${e.color}">
        <div class="tl-epoch-head">
          <h2><a href="#/epoche/${e.id}">${esc(e.title)}</a></h2>
          <span class="range">${esc(epochRange(e))}</span>
          <span class="band"></span>
        </div>
        <div class="tl-epoch-body">${items}</div>
      </section>`;
    }).join('');
    tl.innerHTML = html || `<div class="empty card"><h2>Keine Ereignisse</h2><p>Für diese Kombination aus Epoche und Region gibt es keine Einträge.</p></div>`;
    count.textContent = `${total} ${total === 1 ? 'Ereignis' : 'Ereignisse'}`;
  }

  function apply() {
    setQuery({ epoche: epochFilter || null, region: regionFilter || null });
    setTimelineFilters({ epoch: epochFilter, region: regionFilter });
    renderFilters();
    renderTimeline();
  }

  epochBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    epochFilter = b.dataset.id;
    apply();
  });
  regionBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    regionFilter = b.dataset.id;
    apply();
  });

  const topBtn = el.querySelector('#tl-top');
  const onScroll = () => { topBtn.hidden = window.scrollY < 600; };
  window.addEventListener('scroll', onScroll, { passive: true });
  topBtn.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

  apply();
  return () => window.removeEventListener('scroll', onScroll);
}
