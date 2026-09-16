import { DB, themeEvents } from '../data.js';
import { esc, themeTile, eventItem, personCard, termItem, tagChips, setTitle, backLink, sectionHead, emptyState, bindAnchorScroll } from '../ui.js';
import { render as notFound } from './notfound.js';
import { t, plural } from '../i18n.js';

export function renderList(el) {
  setTitle(t('themes.title'));
  if (!DB.themes.length) {
    el.innerHTML = `<h1>${esc(t('themes.title'))}</h1>${emptyState(t('themes.empty.title'), t('themes.empty.text'), '#/epochen', t('themes.empty.link'))}`;
    return;
  }
  el.innerHTML = `
    <h1>${esc(t('themes.title'))}</h1>
    <p class="muted intro-text">${esc(t('themes.intro'))}</p>
    <div class="card-grid">${DB.themes.map(themeTile).join('')}</div>
  `;
}

export function renderDetail(el, { id }) {
  const th = DB.themesById.get(id);
  if (!th) return notFound(el, {}, { message: t('themes.notfound') });
  setTitle(th.title);
  const events = themeEvents(th);
  const persons = (th.personIds || []).map((pid) => DB.personsById.get(pid)).filter(Boolean).sort((a, b) => (a.born ?? 0) - (b.born ?? 0));
  const terms = (th.termIds || []).map((tid) => DB.termsById.get(tid)).filter(Boolean);
  const epochIds = [...new Set(events.map((ev) => ev.epochId))];
  const epochsCovered = DB.epochs.filter((e) => epochIds.includes(e.id));

  // Ereignisse nach Epoche gruppieren (chronologisch)
  const groups = epochsCovered.map((e) => ({ epoch: e, events: events.filter((ev) => ev.epochId === e.id) }));

  el.innerHTML = `
    ${backLink('#/themen', t('themes.back'))}
    <header class="hero" style="--epoch-color:${th.color}">
      <div class="hero-range">${esc(t('tile.theme.kicker'))} · ${plural(events.length, 'unit.event')} · ${plural(epochsCovered.length, 'unit.epoch')}</div>
      <h1>${esc(th.title)}</h1>
      ${th.subtitle ? `<p class="hero-sub">${esc(th.subtitle)}</p>` : ''}
      <p>${esc(th.summary)}</p>
    </header>

    <nav class="toc" aria-label="${esc(t('epoch.toc.title'))}">
      <a data-anchor="einfuehrung" href="#">${esc(t('themes.intro.title'))}</a>
      <a data-anchor="verlauf" href="#">${esc(t('themes.course.title'))}</a>
      ${persons.length ? `<a data-anchor="personen" href="#">${esc(t('heading.persons'))}</a>` : ''}
      ${terms.length ? `<a data-anchor="begriffe" href="#">${esc(t('heading.terms'))}</a>` : ''}
    </nav>

    <article class="article" id="einfuehrung">
      ${sectionHead(t('themes.intro.title'))}
      ${(th.intro || []).map((p) => `<p>${esc(p)}</p>`).join('')}
    </article>

    <section class="section" id="verlauf">
      ${sectionHead(t('themes.course.title'))}
      <div class="epoch-strip">${epochsCovered.map((e) => `<a class="chip" href="#/epoche/${e.id}" style="--chip-color:${e.color}"><span class="dot"></span>${esc(e.title)}</a>`).join('')}</div>
      ${groups.map(({ epoch, events: evs }) => `
        <div class="group" style="--epoch-color:${epoch.color}">
          <h3 class="group-title"><span class="dot"></span>${esc(epoch.title)}</h3>
          <div class="list">${evs.map((ev) => eventItem(ev)).join('')}</div>
        </div>`).join('')}
    </section>

    ${persons.length ? `<section class="section" id="personen">${sectionHead(t('heading.persons'))}<div class="person-grid">${persons.map(personCard).join('')}</div></section>` : ''}
    ${terms.length ? `<section class="section" id="begriffe">${sectionHead(t('heading.terms'))}<div class="term-list">${terms.map((g) => termItem(g)).join('')}</div></section>` : ''}
    ${tagChips(th.tags)}
  `;
  bindAnchorScroll(el);
}
