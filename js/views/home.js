import { DB, randomEvent } from '../data.js';
import { esc, epochTile, themeTile, regionTile, formatRange, regionChip, epochChip, setTitle, sectionHead } from '../ui.js';
import { getQuizProgress, isInstallHintDismissed, dismissInstallHint } from '../store.js';
import { t, plural } from '../i18n.js';

export function render(el, params, ctx) {
  setTitle('');
  const ev = randomEvent();
  const epoch = ev ? DB.epochsById.get(ev.epochId) : null;
  const progress = getQuizProgress();
  const mastered = DB.epochs.filter((e) => {
    const p = progress[e.id];
    return p && p.total && p.best / p.total >= 0.8;
  }).length;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const showIosHint = !window.wgIsNative && isIOS && !standalone && !isInstallHintDismissed();
  const showAndroidHint = !standalone && !isInstallHintDismissed() && window.wgInstall?.available();

  el.innerHTML = `
    <section class="intro">
      <h1>${esc(t('app.name'))}</h1>
      <p>${esc(t('home.intro'))}</p>
      <div class="stats-row">
        <div class="stat"><b>${DB.epochs.length}</b><span>${esc(t('unit.epoch.other'))}</span></div>
        <div class="stat"><b>${DB.themes.length}</b><span>${esc(t('unit.theme.other'))}</span></div>
        <div class="stat"><b>${DB.events.length}</b><span>${esc(t('unit.event.other'))}</span></div>
        <div class="stat"><b>${DB.persons.length}</b><span>${esc(t('unit.person.other'))}</span></div>
        <div class="stat"><b>${DB.glossary.length}</b><span>${esc(t('unit.term.other'))}</span></div>
        <div class="stat"><b>${DB.quiz.length}</b><span>${esc(t('home.stat.quiz'))}</span></div>
      </div>
      <div class="btn-row">
        <a class="btn btn-primary" href="#/epochen">${esc(t('home.cta.epochs'))}</a>
        <a class="btn" href="#/zeitleiste">${esc(t('home.cta.timeline'))}</a>
        <a class="btn" href="#/quiz">${esc(t('home.cta.quiz'))}</a>
      </div>
    </section>

    ${showIosHint ? `
    <section class="card install-hint" id="ios-hint">
      <h3>${esc(t('home.install.title'))}</h3>
      <p class="muted">${esc(t('home.install.ios'))}</p>
      <button type="button" class="btn btn-small" id="ios-hint-close">${esc(t('home.install.dismiss'))}</button>
    </section>` : ''}
    ${showAndroidHint ? `
    <section class="card install-hint" id="ios-hint">
      <h3>${esc(t('home.install.title'))}</h3>
      <p class="muted">${esc(t('home.install.android', { name: t('app.name') }))}</p>
      <div class="btn-row" style="margin-bottom:0"><button type="button" class="btn btn-primary btn-small" id="install-now">${esc(t('home.install.action'))}</button><button type="button" class="btn btn-small" id="ios-hint-close">${esc(t('home.install.dismiss'))}</button></div>
    </section>` : ''}

    <div class="two-col">
      ${ev ? `
      <section class="card random-card" style="--epoch-color:${epoch?.color}">
        <div class="muted">${esc(t('home.random.kicker'))}</div>
        <h3><a href="#/ereignis/${ev.id}">${esc(ev.title)}</a></h3>
        <div class="meta-row"><span class="chip">${esc(formatRange(ev.year, ev.endYear, ev.approx))}</span>${regionChip(ev.regionId)}${epochChip(ev.epochId)}</div>
        <p class="muted">${esc(ev.summary)}</p>
        <div class="btn-row" style="margin-bottom:0"><a class="btn btn-small" href="#/ereignis/${ev.id}">${esc(t('home.random.more'))}</a><button type="button" class="btn btn-small" id="random-again">${esc(t('home.random.again'))}</button></div>
      </section>` : ''}
      <section class="card">
        <div class="muted">${esc(t('home.progress.kicker'))}</div>
        <h3>${esc(t('home.progress.title', { done: mastered, total: DB.epochs.length }))}</h3>
        <div class="progress" aria-label="${esc(t('home.progress.label'))}"><span style="width:${DB.epochs.length ? Math.round((mastered / DB.epochs.length) * 100) : 0}%"></span></div>
        <p class="muted" style="margin-top:8px">${esc(t('home.progress.hint'))}</p>
        <a class="btn btn-small" href="#/quiz">${esc(t('home.progress.link'))}</a>
      </section>
    </div>

    <section class="section">
      ${sectionHead(t('home.section.epochs'), null, `<a href="#/epochen">${esc(t('home.showall'))}</a>`)}
      <p class="muted">${esc(t('home.epochs.note'))}</p>
      <div class="card-grid">${DB.epochs.map((e, i) => epochTile(e, i + 1)).join('')}</div>
    </section>

    ${DB.themes.length ? `
    <section class="section">
      ${sectionHead(t('home.section.themes'), null, `<a href="#/themen">${esc(t('home.showall'))}</a>`)}
      <p class="muted">${esc(t('home.themes.note'))}</p>
      <div class="card-grid">${DB.themes.map(themeTile).join('')}</div>
    </section>` : ''}

    <section class="section">
      ${sectionHead(t('home.section.regions'), null, `<a href="#/regionen">${esc(t('home.showall'))}</a>`)}
      <div class="card-grid card-grid-compact">${DB.regions.map(regionTile).join('')}</div>
    </section>

    <section class="section">
      ${sectionHead(t('home.section.reference'))}
      <div class="card-grid">
        <a class="card card-link hub-card" href="#/glossar"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-glossary"/></svg><span><span class="title">${esc(t('home.hub.glossary.title'))}</span><span class="sub">${esc(t('home.hub.glossary.sub', { terms: plural(DB.glossary.length, 'unit.term') }))}</span></span></a>
        <a class="card card-link hub-card" href="#/suche"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-search"/></svg><span><span class="title">${esc(t('home.hub.search.title'))}</span><span class="sub">${esc(t('home.hub.search.sub'))}</span></span></a>
        <a class="card card-link hub-card" href="#/lesezeichen"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-bookmark"/></svg><span><span class="title">${esc(t('home.hub.bookmarks.title'))}</span><span class="sub">${esc(t('home.hub.bookmarks.sub'))}</span></span></a>
      </div>
    </section>
  `;

  el.querySelector('#random-again')?.addEventListener('click', () => render(el, params, ctx));
  el.querySelector('#install-now')?.addEventListener('click', () => window.wgInstall?.prompt());
  el.querySelector('#ios-hint-close')?.addEventListener('click', () => {
    dismissInstallHint();
    el.querySelector('#ios-hint')?.remove();
  });
  const onInstallable = () => { if (location.hash === '#/' || location.hash === '') render(el, params, ctx); };
  document.addEventListener('wg:installable', onInstallable, { once: true });
}
