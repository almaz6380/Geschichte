import { DB, centuryKey, centuryLabel } from '../data.js';
import { esc, epochRange, eventItem, personCard, termItem, bookmarkButton, regionChip, themeChip, tagChips, setTitle, backLink, sectionHead, bindAnchorScroll } from '../ui.js';
import { render as notFound } from './notfound.js';
import { getQuizProgress } from '../store.js';
import { t, plural } from '../i18n.js';

function groupByCentury(events) {
  const groups = [];
  let cur = null;
  for (const ev of events) {
    const k = centuryKey(ev.year);
    if (!cur || cur.key !== k) { cur = { key: k, label: centuryLabel(ev.year), events: [] }; groups.push(cur); }
    cur.events.push(ev);
  }
  return groups;
}

export function render(el, { slug }) {
  const e = DB.epochsById.get(slug);
  if (!e) return notFound(el, {}, { message: t('epoch.notfound') });
  setTitle(e.title);
  const events = DB.eventsByEpoch.get(e.id) || [];
  const persons = DB.personsByEpoch.get(e.id) || [];
  const terms = DB.termsByEpoch.get(e.id) || [];
  const themes = DB.themesByEpoch.get(e.id) || [];
  const quizCount = DB.quizByEpoch.get(e.id)?.length || 0;
  const prog = getQuizProgress()[e.id];
  const idx = DB.epochs.findIndex((x) => x.id === e.id);
  const prev = DB.epochs[idx - 1];
  const next = DB.epochs[idx + 1];
  const milestones = events.filter((ev) => ev.importance === 3).length;
  const sections = e.sections || [];
  const useCenturies = events.length >= 12 && (e.end - e.start) >= 250;

  const toc = [
    e.keyFacts?.length ? ['blick', t('epoch.keyfacts.title')] : null,
    ['ueberblick', t('epoch.overview.title')],
    ...sections.map((s) => [`sec-${s.id}`, s.title]),
    ['ereignisse', t('epoch.toc.events')],
    persons.length ? ['personen', t('epoch.toc.persons')] : null,
    terms.length ? ['begriffe', t('epoch.toc.terms')] : null,
    ['folgen', t('epoch.toc.consequences')],
  ].filter(Boolean);

  const renderEvents = (onlyMilestones) => {
    const list = onlyMilestones ? events.filter((ev) => ev.importance === 3) : events;
    if (!useCenturies) return `<div class="list">${list.map((ev) => eventItem(ev)).join('')}</div>`;
    return groupByCentury(list).map((g) => `
      <div class="century-group">
        <h3 class="century-label"><span>${esc(g.label)}</span></h3>
        <div class="list">${g.events.map((ev) => eventItem(ev)).join('')}</div>
      </div>`).join('');
  };

  el.innerHTML = `
    ${backLink('#/epochen', t('epoch.back'))}
    <header class="hero" style="--epoch-color:${e.color}">
      <div class="hero-range">${esc(t('epoch.hero.position', { index: idx + 1, total: DB.epochs.length }))} · ${esc(epochRange(e))}</div>
      <h1>${esc(e.title)}</h1>
      <p>${esc(e.summary)}</p>
      <div class="btn-row">
        ${quizCount ? `<a class="btn" href="#/quiz/${e.id}">${esc(t('epoch.quiz.start'))}${prog ? ` · ${esc(t('epoch.quiz.best', { best: prog.best, total: prog.total }))}` : ''}</a>` : ''}
        <a class="btn" href="#/zeitleiste?epoche=${e.id}">${esc(t('epoch.timeline'))}</a>
      </div>
    </header>

    <div class="meta-row">
      ${e.regions.map(regionChip).join('')}
      <span style="margin-left:auto">${bookmarkButton('epoch', e.id)}</span>
    </div>

    <div class="article-layout">
      <nav class="toc" aria-label="${esc(t('epoch.toc.aria'))}">
        <div class="toc-title">${esc(t('epoch.toc.title'))}</div>
        ${toc.map(([id, label]) => `<a data-anchor="${id}" href="#">${esc(label)}</a>`).join('')}
      </nav>

      <div class="article-body">
        ${e.keyFacts?.length ? `
        <section class="section keyfacts" id="blick">
          <h2>${esc(t('epoch.keyfacts.title'))}</h2>
          <ul>${e.keyFacts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
          <div class="keyfacts-stats">
            <span><b>${events.length}</b> ${esc(t('unit.event.other'))}</span>
            <span><b>${milestones}</b> ${esc(t('epoch.keyfacts.milestones'))}</span>
            <span><b>${persons.length}</b> ${esc(t('unit.person.other'))}</span>
            <span><b>${terms.length}</b> ${esc(t('unit.term.other'))}</span>
          </div>
        </section>` : ''}

        <article class="article" id="ueberblick">
          <h2>${esc(t('epoch.overview.title'))}</h2>
          ${e.overview.map((p, i) => `<p${i === 0 ? ' class="lead"' : ''}>${esc(p)}</p>`).join('')}
        </article>

        ${sections.map((s) => `
        <article class="article section" id="sec-${esc(s.id)}">
          <h2>${esc(s.title)}</h2>
          ${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}
        </article>`).join('')}

        <section class="section" id="ereignisse">
          ${sectionHead(t('epoch.events.title'), null, `
            <label class="toggle"><input type="checkbox" id="only-milestones"> <span>${esc(t('epoch.events.only', { n: milestones }))}</span></label>`)}
          <div id="events-box">${renderEvents(false)}</div>
        </section>

        ${persons.length ? `
        <section class="section" id="personen">
          ${sectionHead(t('epoch.persons.title'), null, `<span class="muted">${plural(persons.length, 'unit.person')}</span>`)}
          <div class="person-grid">${persons.map(personCard).join('')}</div>
        </section>` : ''}

        ${terms.length ? `
        <section class="section" id="begriffe">
          ${sectionHead(t('epoch.terms.title'), null, `<a href="#/glossar?epoche=${e.id}">${esc(t('epoch.terms.link'))}</a>`)}
          <div class="term-list">${terms.map((g) => termItem(g, { showEpoch: false })).join('')}</div>
        </section>` : ''}

        <section class="section article" id="folgen">
          <h2>${esc(t('epoch.consequences.title'))}</h2>
          <ul class="consequences">${e.consequences.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
          ${tagChips(e.tags)}
        </section>

        ${themes.length ? `
        <section class="section">
          ${sectionHead(t('epoch.themes.title'))}
          <div class="chip-row">${themes.map(themeChip).join('')}</div>
        </section>` : ''}

        <nav class="pager" aria-label="${esc(t('epoch.nav.aria'))}">
          ${prev ? `<a href="#/epoche/${prev.id}"><span class="lbl">${esc(t('epoch.nav.prev'))}</span><span>${esc(prev.title)}</span></a>` : '<span></span>'}
          ${next ? `<a class="next" href="#/epoche/${next.id}"><span class="lbl">${esc(t('epoch.nav.next'))}</span><span>${esc(next.title)}</span></a>` : '<span></span>'}
        </nav>
      </div>
    </div>
  `;

  bindAnchorScroll(el);
  el.querySelector('#only-milestones').addEventListener('change', (ev) => {
    el.querySelector('#events-box').innerHTML = renderEvents(ev.target.checked);
  });

  // Aktiven TOC-Eintrag beim Scrollen markieren
  const links = [...el.querySelectorAll('.toc a[data-anchor]')];
  const targets = links.map((a) => el.querySelector('#' + CSS.escape(a.dataset.anchor))).filter(Boolean);
  let obs = null;
  if ('IntersectionObserver' in window && targets.length) {
    obs = new IntersectionObserver((entries) => {
      const visible = entries.filter((x) => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      links.forEach((a) => a.toggleAttribute('aria-current', a.dataset.anchor === visible.target.id));
    }, { rootMargin: '-120px 0px -60% 0px', threshold: 0 });
    targets.forEach((t) => obs.observe(t));
  }
  return () => obs?.disconnect();
}
