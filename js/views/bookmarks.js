import { DB } from '../data.js';
import { epochTile, eventItem, personItem, emptyState, setTitle } from '../ui.js';
import { getBookmarks } from '../store.js';

export function render(el) {
  setTitle('Lesezeichen');
  const bm = getBookmarks();
  const epochs = bm.epoch.map((id) => DB.epochsById.get(id)).filter(Boolean);
  const events = bm.event.map((id) => DB.eventsById.get(id)).filter(Boolean).sort((a, b) => a.year - b.year);
  const persons = bm.person.map((id) => DB.personsById.get(id)).filter(Boolean);
  const total = epochs.length + events.length + persons.length;

  if (!total) {
    el.innerHTML = `<h1>Lesezeichen</h1>${emptyState('Noch keine Lesezeichen', 'Tippe auf „Merken“ bei einer Epoche, einem Ereignis oder einer Person, um sie hier zu sammeln.', '#/epochen', 'Epochen entdecken')}`;
    return;
  }

  el.innerHTML = `
    <h1>Lesezeichen</h1>
    <p class="muted">${total} gespeicherte ${total === 1 ? 'Eintrag' : 'Einträge'}. Lesezeichen werden nur auf diesem Gerät gespeichert.</p>
    ${epochs.length ? `<section class="section"><h2>Epochen</h2><div class="card-grid">${epochs.map((e) => epochTile(e, e.order)).join('')}</div></section>` : ''}
    ${events.length ? `<section class="section"><h2>Ereignisse</h2><div class="list">${events.map((ev) => eventItem(ev, { showEpoch: true })).join('')}</div></section>` : ''}
    ${persons.length ? `<section class="section"><h2>Personen</h2><div class="list">${persons.map(personItem).join('')}</div></section>` : ''}
  `;
}
