import { DB } from './data.js';
import { isBookmarked, toggleBookmark } from './store.js';

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const nf = new Intl.NumberFormat('de-DE');

export function formatYear(year, approx = false) {
  if (year === null || year === undefined) return '?';
  const abs = Math.abs(year);
  const num = abs >= 10000 ? nf.format(abs) : String(abs);
  const s = year < 0 ? `${num} v. Chr.` : (abs < 1000 ? `${num} n. Chr.` : num);
  return approx ? `ca. ${s}` : s;
}

export function formatRange(start, end, approx = false) {
  if (end === null || end === undefined || end === start) return formatYear(start, approx);
  if (start < 0 && end < 0) return `${approx ? 'ca. ' : ''}${nf.format(-start)}–${nf.format(-end)} v. Chr.`;
  if (start > 0 && end > 0 && start >= 1000 && end >= 1000) return `${approx ? 'ca. ' : ''}${start}–${end}`;
  return `${formatYear(start, approx)} – ${formatYear(end)}`;
}

export function epochRange(e) {
  const end = e.end >= 2026 ? 'heute' : formatYear(e.end);
  return `${formatYear(e.start, e.start <= -10000)} – ${end}`;
}

export function lifeSpan(p) {
  if (p.born === null && p.died === null) return '';
  const b = p.born === null ? '?' : formatYear(p.born);
  const d = p.died === null ? '' : formatYear(p.died);
  return `${p.approx ? 'ca. ' : ''}${b}${d ? ' – ' + d : ''}`;
}

export function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }

export function regionChip(regionId) {
  const r = DB.regionsById.get(regionId);
  if (!r) return '';
  return `<a class="chip" href="#/region/${r.id}" style="--chip-color:${r.color}"><span class="dot"></span>${esc(r.name)}</a>`;
}

export function epochChip(epochId) {
  const e = DB.epochsById.get(epochId);
  if (!e) return '';
  return `<a class="chip" href="#/epoche/${e.id}" style="--chip-color:${e.color}"><span class="dot"></span>${esc(e.title)}</a>`;
}

export function themeChip(t) {
  return `<a class="chip" href="#/thema/${t.id}" style="--chip-color:${t.color}"><span class="dot"></span>${esc(t.title)}</a>`;
}

export function tagChips(tags) {
  return `<div class="chip-row">${(tags || []).map((t) => `<a class="chip chip-tag" href="#/suche?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div>`;
}

export function epochTile(e, index) {
  const n = DB.eventsByEpoch.get(e.id)?.length ?? 0;
  const p = DB.personsByEpoch.get(e.id)?.length ?? 0;
  return `
    <a class="card card-link epoch-tile" href="#/epoche/${e.id}" style="--epoch-color:${e.color}">
      <span class="epoch-num" aria-hidden="true">${index ?? e.order}</span>
      <div class="epoch-range">${esc(epochRange(e))}</div>
      <h3>${esc(e.title)}</h3>
      <p class="muted">${esc(e.summary)}</p>
      <div class="tile-meta"><span>${plural(n, 'Ereignis', 'Ereignisse')}</span><span>${plural(p, 'Person', 'Personen')}</span></div>
    </a>`;
}

export function themeTile(t) {
  const n = (t.eventIds || []).length;
  return `
    <a class="card card-link theme-tile" href="#/thema/${t.id}" style="--epoch-color:${t.color}">
      <div class="epoch-range">Querschnittsthema</div>
      <h3>${esc(t.title)}</h3>
      ${t.subtitle ? `<div class="muted">${esc(t.subtitle)}</div>` : ''}
      <p class="muted">${esc(t.summary)}</p>
      <div class="tile-meta"><span>${plural(n, 'Ereignis', 'Ereignisse')} durch alle Epochen</span></div>
    </a>`;
}

export function regionTile(r) {
  const n = DB.eventsByRegion.get(r.id)?.length ?? 0;
  const p = DB.personsByRegion.get(r.id)?.length ?? 0;
  return `
    <a class="card card-link region-tile" href="#/region/${r.id}" style="--epoch-color:${r.color}">
      <h3>${esc(r.name)}</h3>
      <div class="tile-meta"><span>${plural(n, 'Ereignis', 'Ereignisse')}</span><span>${plural(p, 'Person', 'Personen')}</span></div>
    </a>`;
}

export function eventItem(ev, { showEpoch = false } = {}) {
  const epoch = DB.epochsById.get(ev.epochId);
  return `
    <a class="list-item ${ev.importance === 3 ? 'milestone' : ''}" href="#/ereignis/${ev.id}" style="--epoch-color:${epoch?.color ?? 'var(--accent)'}">
      <span class="year">${esc(formatRange(ev.year, ev.endYear, ev.approx))}</span>
      <span>
        <span class="title">${esc(ev.title)}</span>${ev.importance === 3 ? ' <span class="star" title="Meilenstein">★</span>' : ''}
        <div class="sub">${esc(ev.summary)}</div>
        ${showEpoch && epoch ? `<div class="sub sub-epoch"><span class="dot" style="background:${epoch.color}"></span>${esc(epoch.title)}</div>` : ''}
      </span>
    </a>`;
}

export function personItem(p) {
  const epoch = DB.epochsById.get(p.epochId);
  return `
    <a class="list-item" href="#/person/${p.id}" style="--epoch-color:${epoch?.color ?? 'var(--accent)'}">
      <span class="year">${esc(lifeSpan(p) || '–')}</span>
      <span>
        <span class="title">${esc(p.name)}</span>
        <div class="sub">${esc(p.role)}</div>
      </span>
    </a>`;
}

export function personCard(p) {
  const epoch = DB.epochsById.get(p.epochId);
  const initials = p.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return `
    <a class="card card-link person-card" href="#/person/${p.id}" style="--epoch-color:${epoch?.color ?? 'var(--accent)'}">
      <span class="avatar" aria-hidden="true">${esc(initials)}</span>
      <span>
        <span class="title">${esc(p.name)}</span>
        <div class="sub">${esc(p.role)}</div>
        <div class="sub muted">${esc(lifeSpan(p))}</div>
      </span>
    </a>`;
}

export function termItem(g, { showEpoch = true } = {}) {
  const epoch = g.epochId ? DB.epochsById.get(g.epochId) : null;
  const related = (g.related || []).map((id) => {
    const ev = DB.eventsById.get(id); if (ev) return `<a class="chip" href="#/ereignis/${ev.id}">${esc(ev.title)}</a>`;
    const p = DB.personsById.get(id); if (p) return `<a class="chip" href="#/person/${p.id}">${esc(p.name)}</a>`;
    const e = DB.epochsById.get(id); if (e) return `<a class="chip" href="#/epoche/${e.id}">${esc(e.title)}</a>`;
    return '';
  }).join('');
  return `
    <article class="term" id="term-${esc(g.id)}">
      <h3 class="term-title">${esc(g.term)}${showEpoch && epoch ? ` <a class="term-epoch" href="#/epoche/${epoch.id}" style="color:${epoch.color}">${esc(epoch.title)}</a>` : ''}</h3>
      <p>${esc(g.definition)}</p>
      ${related ? `<div class="chip-row">${related}</div>` : ''}
    </article>`;
}

export function bookmarkButton(type, id, label = 'Merken') {
  const on = isBookmarked(type, id);
  return `<button type="button" class="bm-btn" data-bm-type="${type}" data-bm-id="${esc(id)}" aria-pressed="${on}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${on ? 'i-bookmark-filled' : 'i-bookmark'}"/></svg>
      <span>${on ? 'Gemerkt' : label}</span>
    </button>`;
}

export function handleBookmarkClick(e) {
  const btn = e.target.closest('[data-bm-type]');
  if (!btn) return false;
  const on = toggleBookmark(btn.dataset.bmType, btn.dataset.bmId);
  btn.setAttribute('aria-pressed', String(on));
  btn.querySelector('use').setAttribute('href', on ? '#i-bookmark-filled' : '#i-bookmark');
  btn.querySelector('span').textContent = on ? 'Gemerkt' : 'Merken';
  showToast(on ? 'Lesezeichen gespeichert' : 'Lesezeichen entfernt');
  return true;
}

let toastTimer = null;
export function showToast(text, { action, onAction, sticky = false } = {}) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = `<span>${esc(text)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  t.hidden = false;
  if (action && onAction) t.querySelector('button').addEventListener('click', () => { t.hidden = true; onAction(); });
  clearTimeout(toastTimer);
  if (!sticky) toastTimer = setTimeout(() => { t.hidden = true; }, 2500);
}

export function setTitle(t) {
  document.title = t ? `${t} – Weltgeschichte` : 'Weltgeschichte';
}

export function backLink(href, label) {
  return `<a class="back-link" href="${href}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-arrow-left"/></svg>${esc(label)}</a>`;
}

export function emptyState(title, text, linkHref, linkLabel) {
  return `<div class="empty card"><h2>${esc(title)}</h2><p>${esc(text)}</p>${linkHref ? `<a class="btn btn-primary" href="${linkHref}">${esc(linkLabel)}</a>` : ''}</div>`;
}

export function sectionHead(title, id, extra = '') {
  return `<div class="section-head" ${id ? `id="${esc(id)}"` : ''}><h2>${esc(title)}</h2>${extra}</div>`;
}

// Scrollt zu einem Anker innerhalb der aktuellen View (Hash bleibt Route).
export function bindAnchorScroll(container) {
  container.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-anchor]');
    if (!a) return;
    e.preventDefault();
    const target = container.querySelector('#' + CSS.escape(a.dataset.anchor));
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top, behavior: 'smooth' });
    container.querySelectorAll('a[data-anchor]').forEach((x) => x.removeAttribute('aria-current'));
    a.setAttribute('aria-current', 'true');
  });
}
