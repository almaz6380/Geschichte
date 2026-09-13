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
  // Gleiche Ära: "264–146 v. Chr."
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

export function regionChip(regionId) {
  const r = DB.regionsById.get(regionId);
  if (!r) return '';
  return `<span class="chip" style="--chip-color:${r.color}"><span class="dot"></span>${esc(r.name)}</span>`;
}

export function epochChip(epochId) {
  const e = DB.epochsById.get(epochId);
  if (!e) return '';
  return `<a class="chip" href="#/epoche/${e.id}" style="--chip-color:${e.color}"><span class="dot"></span>${esc(e.title)}</a>`;
}

export function epochTile(e, index) {
  const n = DB.eventsByEpoch.get(e.id)?.length ?? 0;
  return `
    <a class="card card-link epoch-tile" href="#/epoche/${e.id}" style="--epoch-color:${e.color}">
      <span class="epoch-num" aria-hidden="true">${index ?? e.order}</span>
      <div class="epoch-range">${esc(epochRange(e))}</div>
      <h3>${esc(e.title)}</h3>
      <p class="muted">${esc(e.summary)}</p>
      <div class="muted">${n} Ereignisse</div>
    </a>`;
}

export function eventItem(ev, { showEpoch = false } = {}) {
  const epoch = DB.epochsById.get(ev.epochId);
  return `
    <a class="list-item" href="#/ereignis/${ev.id}" style="--epoch-color:${epoch?.color ?? 'var(--accent)'}">
      <span class="year">${esc(formatRange(ev.year, ev.endYear, ev.approx))}</span>
      <span>
        <span class="title">${esc(ev.title)}</span>
        <div class="sub">${esc(ev.summary)}</div>
        ${showEpoch && epoch ? `<div class="sub">${esc(epoch.title)}</div>` : ''}
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

export function bookmarkButton(type, id, label = 'Merken') {
  const on = isBookmarked(type, id);
  return `<button type="button" class="bm-btn" data-bm-type="${type}" data-bm-id="${esc(id)}" aria-pressed="${on}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${on ? 'i-bookmark-filled' : 'i-bookmark'}"/></svg>
      <span>${on ? 'Gemerkt' : label}</span>
    </button>`;
}

// Delegierter Klick-Handler für Lesezeichen-Buttons (einmal in app.js registriert)
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
