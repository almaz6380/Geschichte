import { DB, themeEvents } from '../data.js';
import { esc, themeTile, eventItem, personCard, termItem, tagChips, setTitle, backLink, sectionHead, emptyState, bindAnchorScroll } from '../ui.js';
import { render as notFound } from './notfound.js';
import { plural } from '../i18n.js';

export function renderList(el) {
  setTitle('Querschnittsthemen');
  if (!DB.themes.length) {
    el.innerHTML = `<h1>Querschnittsthemen</h1>${emptyState('Noch keine Themen', 'Die Themen werden gerade vorbereitet.', '#/epochen', 'Zu den Epochen')}`;
    return;
  }
  el.innerHTML = `
    <h1>Querschnittsthemen</h1>
    <p class="muted intro-text">Geschichte quer gelesen: Jedes Thema verbindet Ereignisse, Personen und Begriffe aus allen Epochen zu einer roten Linie – von den Anfängen bis heute.</p>
    <div class="card-grid">${DB.themes.map(themeTile).join('')}</div>
  `;
}

export function renderDetail(el, { id }) {
  const t = DB.themesById.get(id);
  if (!t) return notFound(el, {}, { message: 'Dieses Thema gibt es nicht.' });
  setTitle(t.title);
  const events = themeEvents(t);
  const persons = (t.personIds || []).map((pid) => DB.personsById.get(pid)).filter(Boolean).sort((a, b) => (a.born ?? 0) - (b.born ?? 0));
  const terms = (t.termIds || []).map((tid) => DB.termsById.get(tid)).filter(Boolean);
  const epochIds = [...new Set(events.map((ev) => ev.epochId))];
  const epochsCovered = DB.epochs.filter((e) => epochIds.includes(e.id));

  // Ereignisse nach Epoche gruppieren (chronologisch)
  const groups = epochsCovered.map((e) => ({ epoch: e, events: events.filter((ev) => ev.epochId === e.id) }));

  el.innerHTML = `
    ${backLink('#/themen', 'Alle Themen')}
    <header class="hero" style="--epoch-color:${t.color}">
      <div class="hero-range">Querschnittsthema · ${plural(events.length, 'unit.event')} · ${plural(epochsCovered.length, 'unit.epoch')}</div>
      <h1>${esc(t.title)}</h1>
      ${t.subtitle ? `<p class="hero-sub">${esc(t.subtitle)}</p>` : ''}
      <p>${esc(t.summary)}</p>
    </header>

    <nav class="toc" aria-label="Inhalt">
      <a data-anchor="einfuehrung" href="#">Einführung</a>
      <a data-anchor="verlauf" href="#">Verlauf durch die Epochen</a>
      ${persons.length ? '<a data-anchor="personen" href="#">Personen</a>' : ''}
      ${terms.length ? '<a data-anchor="begriffe" href="#">Begriffe</a>' : ''}
    </nav>

    <article class="article" id="einfuehrung">
      ${sectionHead('Einführung')}
      ${(t.intro || []).map((p) => `<p>${esc(p)}</p>`).join('')}
    </article>

    <section class="section" id="verlauf">
      ${sectionHead('Verlauf durch die Epochen')}
      <div class="epoch-strip">${epochsCovered.map((e) => `<a class="chip" href="#/epoche/${e.id}" style="--chip-color:${e.color}"><span class="dot"></span>${esc(e.title)}</a>`).join('')}</div>
      ${groups.map(({ epoch, events: evs }) => `
        <div class="group" style="--epoch-color:${epoch.color}">
          <h3 class="group-title"><span class="dot"></span>${esc(epoch.title)}</h3>
          <div class="list">${evs.map((ev) => eventItem(ev)).join('')}</div>
        </div>`).join('')}
    </section>

    ${persons.length ? `<section class="section" id="personen">${sectionHead('Personen')}<div class="person-grid">${persons.map(personCard).join('')}</div></section>` : ''}
    ${terms.length ? `<section class="section" id="begriffe">${sectionHead('Begriffe')}<div class="term-list">${terms.map((g) => termItem(g)).join('')}</div></section>` : ''}
    ${tagChips(t.tags)}
  `;
  bindAnchorScroll(el);
}
