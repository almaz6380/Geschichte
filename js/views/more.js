import { DB } from '../data.js';
import { esc, setTitle } from '../ui.js';
import { getQuizProgress, bookmarkCount, resetQuizProgress, getTheme } from '../store.js';
import { cycleTheme, themeLabel } from '../theme.js';
import { showToast } from '../ui.js';
import { APP_VERSION } from '../version.js';
import { t, plural } from '../i18n.js';

export function render(el) {
  setTitle(t('nav.more'));
  const progress = getQuizProgress();
  const mastered = DB.epochs.filter((e) => progress[e.id] && progress[e.id].best / progress[e.id].total >= 0.8).length;

  el.innerHTML = `
    <h1>${esc(t('nav.more'))}</h1>
    <p class="muted">${esc(t('more.intro'))}</p>

    <section class="section">
      <h2 class="section-title">${esc(t('more.discover'))}</h2>
      <div class="card-grid">
        <a class="card card-link hub-card" href="#/themen"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-topic"/></svg><span><span class="title">${esc(t('home.section.themes'))}</span><span class="sub">${esc(t('more.themes.sub', { themes: plural(DB.themes.length, 'unit.theme') }))}</span></span></a>
        <a class="card card-link hub-card" href="#/glossar"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-glossary"/></svg><span><span class="title">${esc(t('glossary.title'))}</span><span class="sub">${esc(t('home.hub.glossary.sub', { terms: plural(DB.glossary.length, 'unit.term') }))}</span></span></a>
        <a class="card card-link hub-card" href="#/regionen"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-globe"/></svg><span><span class="title">${esc(t('regions.title'))}</span><span class="sub">${esc(t('more.regions.sub'))}</span></span></a>
        <a class="card card-link hub-card" href="#/suche"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-search"/></svg><span><span class="title">${esc(t('search.title'))}</span><span class="sub">${esc(t('more.search.sub'))}</span></span></a>
        <a class="card card-link hub-card" href="#/lesezeichen"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-bookmark"/></svg><span><span class="title">${esc(t('bookmarks.title'))}</span><span class="sub">${esc(t('more.bookmarks.sub', { entries: plural(bookmarkCount(), 'unit.entry') }))}</span></span></a>
        <a class="card card-link hub-card" href="#/quiz"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-quiz"/></svg><span><span class="title">${esc(t('nav.quiz'))}</span><span class="sub">${esc(t('home.progress.title', { done: mastered, total: DB.epochs.length }))}</span></span></a>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">${esc(t('more.settings'))}</h2>
      <div class="card settings">
        <div class="setting-row">
          <span><span class="title">${esc(t('more.theme.title'))}</span><span class="sub" id="theme-label">${esc(themeLabel(getTheme()))}</span></span>
          <button type="button" class="btn btn-small" id="more-theme">${esc(t('more.theme.action'))}</button>
        </div>
        <div class="setting-row">
          <span><span class="title">${esc(t('more.progress.title'))}</span><span class="sub">${esc(t('more.progress.sub'))}</span></span>
          <button type="button" class="btn btn-small" id="more-reset">${esc(t('more.progress.action'))}</button>
        </div>
        <div class="setting-row">
          <span><span class="title">${esc(t('more.offline.title'))}</span><span class="sub">${esc(t('more.offline.sub'))}</span></span>
          <button type="button" class="btn btn-small" id="more-refresh">${esc(t('more.offline.action'))}</button>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">${esc(t('more.about.title'))}</h2>
      <div class="card about">
        <p><strong>${esc(t('app.name'))}</strong> ${esc(t('more.about.text'))}</p>
        <div class="stats-row">
          <div class="stat"><b>${DB.epochs.length}</b><span>${esc(t('unit.epoch.other'))}</span></div>
          <div class="stat"><b>${DB.themes.length}</b><span>${esc(t('unit.theme.other'))}</span></div>
          <div class="stat"><b>${DB.events.length}</b><span>${esc(t('unit.event.other'))}</span></div>
          <div class="stat"><b>${DB.persons.length}</b><span>${esc(t('unit.person.other'))}</span></div>
          <div class="stat"><b>${DB.glossary.length}</b><span>${esc(t('unit.term.other'))}</span></div>
          <div class="stat"><b>${DB.quiz.length}</b><span>${esc(t('home.stat.quiz'))}</span></div>
        </div>
        <p class="muted">${esc(t('more.about.note'))}</p>
        <p class="muted">${esc(t('more.version', { version: APP_VERSION, kind: window.wgIsNative ? t('more.kind.native') : t('more.kind.pwa') }))}</p>
        <p>
          <a class="btn btn-small" href="${window.wgIsNative ? 'https://geschichte-gilt.vercel.app/datenschutz.html' : './datenschutz.html'}" ${window.wgIsNative ? 'target="_blank" rel="noopener"' : ''}>${esc(t('more.privacy'))}</a>
          <a class="btn btn-small" href="${window.wgIsNative ? 'https://geschichte-gilt.vercel.app/impressum.html' : './impressum.html'}" ${window.wgIsNative ? 'target="_blank" rel="noopener"' : ''}>${esc(t('more.imprint'))}</a>
        </p>
      </div>
    </section>
  `;

  el.querySelector('#more-theme').addEventListener('click', () => {
    const scheme = cycleTheme();
    el.querySelector('#theme-label').textContent = themeLabel(scheme);
  });
  el.querySelector('#more-reset').addEventListener('click', () => {
    if (confirm(t('quiz.reset.confirm'))) { resetQuizProgress(); showToast(t('more.progress.done')); render(el); }
  });
  el.querySelector('#more-refresh').addEventListener('click', async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
      await Promise.all(regs.map((r) => r.unregister()));
      showToast(t('more.offline.done'));
      setTimeout(() => location.reload(), 600);
    } catch {
      location.reload();
    }
  });
}
