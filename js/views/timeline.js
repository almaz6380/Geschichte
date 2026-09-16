import { DB, centuryKey, centuryLabel } from '../data.js';
import { esc, formatRange, epochRange, regionChip, setTitle } from '../ui.js';
import { setQuery } from '../router.js';
import { getTimelineFilters, setTimelineFilters } from '../store.js';
import { t, plural } from '../i18n.js';

export function render(el, params, { query }) {
  setTitle(t('timeline.title'));
  const remembered = getTimelineFilters();
  let epochFilter = query.has('epoche') ? query.get('epoche') : remembered.epoch || '';
  let regionFilter = query.has('region') ? query.get('region') : remembered.region || '';
  let themeFilter = query.has('thema') ? query.get('thema') : remembered.theme || '';
  let onlyMilestones = query.has('meilensteine') ? query.get('meilensteine') === '1' : !!remembered.milestones;
  if (epochFilter && !DB.epochsById.has(epochFilter)) epochFilter = '';
  if (regionFilter && !DB.regionsById.has(regionFilter)) regionFilter = '';
  if (themeFilter && !DB.themesById.has(themeFilter)) themeFilter = '';

  el.innerHTML = `
    <h1>${esc(t('timeline.title'))}</h1>
    <p class="muted">${esc(t('timeline.intro'))}</p>
    <div class="tl-filters">
      <div class="chip-scroll" id="tl-epoch-filter" role="group" aria-label="${esc(t('timeline.filter.epoch'))}"></div>
      <div class="chip-scroll" id="tl-region-filter" role="group" aria-label="${esc(t('timeline.filter.region'))}"></div>
      ${DB.themes.length ? `<div class="chip-scroll" id="tl-theme-filter" role="group" aria-label="${esc(t('timeline.filter.theme'))}"></div>` : ''}
      <div class="tl-bar">
        <span class="result-count" id="tl-count"></span>
        <label class="toggle"><input type="checkbox" id="tl-milestones"> <span>${esc(t('timeline.onlyMilestones'))}</span></label>
      </div>
    </div>
    <div class="timeline" id="tl"></div>
    <a class="btn to-top" href="#/zeitleiste" id="tl-top" hidden>↑ ${esc(t('timeline.toTop'))}</a>
  `;

  const epochBox = el.querySelector('#tl-epoch-filter');
  const regionBox = el.querySelector('#tl-region-filter');
  const themeBox = el.querySelector('#tl-theme-filter');
  const tl = el.querySelector('#tl');
  const count = el.querySelector('#tl-count');
  const msBox = el.querySelector('#tl-milestones');

  const chip = (id, label, color, pressed) =>
    `<button type="button" class="chip chip-btn" data-id="${esc(id)}" aria-pressed="${pressed}">${color ? `<span class="dot" style="--chip-color:${color}"></span>` : ''}${esc(label)}</button>`;

  function renderFilters() {
    epochBox.innerHTML = chip('', t('glossary.allEpochs'), null, epochFilter === '') +
      DB.epochs.map((e) => chip(e.id, e.title, e.color, epochFilter === e.id)).join('');
    regionBox.innerHTML = chip('', t('timeline.allRegions'), null, regionFilter === '') +
      DB.regions.map((r) => chip(r.id, r.name, r.color, regionFilter === r.id)).join('');
    if (themeBox) themeBox.innerHTML = chip('', t('timeline.allThemes'), null, themeFilter === '') +
      DB.themes.map((th) => chip(th.id, th.title, th.color, themeFilter === th.id)).join('');
    msBox.checked = onlyMilestones;
  }

  function renderTimeline() {
    const epochs = epochFilter ? [DB.epochsById.get(epochFilter)] : DB.epochs;
    const themeSet = themeFilter ? new Set(DB.themesById.get(themeFilter).eventIds) : null;
    let total = 0;
    const html = epochs.map((e) => {
      let events = DB.eventsByEpoch.get(e.id) || [];
      if (regionFilter) events = events.filter((ev) => ev.regionId === regionFilter);
      if (themeSet) events = events.filter((ev) => themeSet.has(ev.id));
      if (onlyMilestones) events = events.filter((ev) => ev.importance === 3);
      if (!events.length) return '';
      total += events.length;
      const showCenturies = events.length >= 6 && (e.end - e.start) >= 250;
      let lastCentury = null;
      const items = events.map((ev) => {
        let marker = '';
        if (showCenturies) {
          const k = centuryKey(ev.year);
          if (k !== lastCentury) { marker = `<div class="tl-century"><span>${esc(centuryLabel(ev.year))}</span></div>`; lastCentury = k; }
        }
        return `${marker}<a class="tl-event imp-${ev.importance}" href="#/ereignis/${ev.id}">
          <span class="tl-year">${esc(formatRange(ev.year, ev.endYear, ev.approx))}</span>
          <span class="tl-title">${esc(ev.title)}${ev.importance === 3 ? ` <span class="star" title="${esc(t('ui.milestone'))}">★</span>` : ''}</span>
          <div class="tl-sum">${esc(ev.summary)}</div>
          <div class="tl-meta">${regionChip(ev.regionId)}</div>
        </a>`;
      }).join('');
      return `<section class="tl-epoch" id="tl-${e.id}" style="--epoch-color:${e.color}">
        <div class="tl-epoch-head">
          <h2><a href="#/epoche/${e.id}">${esc(e.title)}</a></h2>
          <span class="range">${esc(epochRange(e))} · ${plural(events.length, 'unit.event')}</span>
          <span class="band"></span>
        </div>
        <div class="tl-epoch-body">${items}</div>
      </section>`;
    }).join('');
    tl.innerHTML = html || `<div class="empty card"><h2>${esc(t('timeline.empty.title'))}</h2><p>${esc(t('timeline.empty.text'))}</p></div>`;
    count.textContent = plural(total, 'unit.event');
  }

  function apply() {
    setQuery({ epoche: epochFilter || null, region: regionFilter || null, thema: themeFilter || null, meilensteine: onlyMilestones ? '1' : null });
    setTimelineFilters({ epoch: epochFilter, region: regionFilter, theme: themeFilter, milestones: onlyMilestones });
    renderFilters();
    renderTimeline();
  }

  epochBox.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (!b) return; epochFilter = b.dataset.id; apply(); });
  regionBox.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (!b) return; regionFilter = b.dataset.id; apply(); });
  themeBox?.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (!b) return; themeFilter = b.dataset.id; apply(); });
  msBox.addEventListener('change', () => { onlyMilestones = msBox.checked; apply(); });

  const topBtn = el.querySelector('#tl-top');
  const onScroll = () => { topBtn.hidden = window.scrollY < 600; };
  window.addEventListener('scroll', onScroll, { passive: true });
  topBtn.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

  apply();
  return () => window.removeEventListener('scroll', onScroll);
}
