import { DB } from '../data.js';
import { epochTile, eventItem, personCard, emptyState, setTitle, esc } from '../ui.js';
import { getBookmarks } from '../store.js';
import { t, plural } from '../i18n.js';

export function render(el) {
  setTitle(t('bookmarks.title'));
  const bm = getBookmarks();
  const epochs = bm.epoch.map((id) => DB.epochsById.get(id)).filter(Boolean);
  const events = bm.event.map((id) => DB.eventsById.get(id)).filter(Boolean).sort((a, b) => a.year - b.year);
  const persons = bm.person.map((id) => DB.personsById.get(id)).filter(Boolean);
  const total = epochs.length + events.length + persons.length;

  if (!total) {
    el.innerHTML = `<h1>${esc(t('bookmarks.title'))}</h1>${emptyState(t('bookmarks.empty.title'), t('bookmarks.empty.text', { save: t('ui.bookmark.save') }), '#/epochen', t('home.cta.epochs'))}`;
    return;
  }

  el.innerHTML = `
    <h1>${esc(t('bookmarks.title'))}</h1>
    <p class="muted">${esc(t('bookmarks.count', { entries: plural(total, 'unit.entry') }))}</p>
    ${epochs.length ? `<section class="section"><h2>${esc(t('nav.epochs'))}</h2><div class="card-grid">${epochs.map((e) => epochTile(e, e.order)).join('')}</div></section>` : ''}
    ${events.length ? `<section class="section"><h2>${esc(t('heading.events'))}</h2><div class="list">${events.map((ev) => eventItem(ev, { showEpoch: true })).join('')}</div></section>` : ''}
    ${persons.length ? `<section class="section"><h2>${esc(t('heading.persons'))}</h2><div class="person-grid">${persons.map(personCard).join('')}</div></section>` : ''}
  `;
}
