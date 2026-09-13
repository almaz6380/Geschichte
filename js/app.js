import { loadData } from './data.js';
import { addRoute, startRouter } from './router.js';
import { applyTheme, cycleTheme, themeLabel } from './theme.js';
import { handleBookmarkClick, showToast, esc } from './ui.js';
import * as home from './views/home.js';
import * as epochs from './views/epochs.js';
import * as epoch from './views/epoch.js';
import * as event from './views/event.js';
import * as person from './views/person.js';
import * as timeline from './views/timeline.js';
import * as quiz from './views/quiz.js';
import * as search from './views/search.js';
import * as bookmarks from './views/bookmarks.js';
import * as notfound from './views/notfound.js';

const view = document.getElementById('view');
let cleanup = null;

addRoute('/', home.render);
addRoute('/epochen', epochs.render);
addRoute('/epoche/:slug', epoch.render);
addRoute('/ereignis/:id', event.render);
addRoute('/person/:id', person.render);
addRoute('/zeitleiste', timeline.render);
addRoute('/quiz', quiz.render);
addRoute('/quiz/:slug', quiz.render);
addRoute('/suche', search.render);
addRoute('/lesezeichen', bookmarks.render);

const NAV_KEY = { '': 'home', epochen: 'epochen', epoche: 'epochen', ereignis: 'epochen', person: 'epochen', zeitleiste: 'zeitleiste', quiz: 'quiz', suche: 'suche', lesezeichen: 'lesezeichen' };

function markNav(path) {
  const key = NAV_KEY[path[0] || ''] || '';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === key) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function onNavigate(match, ctx) {
  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  markNav(ctx.path);
  window.scrollTo(0, 0);
  try {
    cleanup = match ? match.handler(view, match.params, ctx) : notfound.render(view, {}, ctx);
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty card"><h2>Fehler</h2><p>${esc(err.message)}</p></div>`;
  }
}

function setupTheme() {
  applyTheme();
  document.getElementById('theme-btn')?.addEventListener('click', () => {
    const t = cycleTheme();
    showToast(`Farbschema: ${themeLabel(t)}`);
  });
}

function setupInstall() {
  const btn = document.getElementById('install-btn');
  let deferred = null;
  window.wgInstall = {
    available: () => !!deferred,
    prompt: async () => {
      if (!deferred) return;
      deferred.prompt();
      await deferred.userChoice.catch(() => {});
      deferred = null;
      btn.hidden = true;
    },
  };
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
    document.dispatchEvent(new CustomEvent('wg:installable'));
  });
  btn?.addEventListener('click', () => window.wgInstall.prompt());
  window.addEventListener('appinstalled', () => { btn.hidden = true; deferred = null; showToast('App installiert'); });
}

function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('Neue Version verfügbar', { action: 'Neu laden', onAction: () => location.reload(), sticky: true });
          }
        });
      });
    } catch (err) {
      console.warn('Service Worker konnte nicht registriert werden:', err);
    }
  });
}

async function main() {
  setupTheme();
  setupInstall();
  setupServiceWorker();
  document.addEventListener('click', (e) => { handleBookmarkClick(e); });
  try {
    await loadData();
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty card"><h2>Inhalte konnten nicht geladen werden</h2><p>${esc(err.message)}</p><button class="btn btn-primary" onclick="location.reload()">Erneut versuchen</button></div>`;
    return;
  }
  startRouter(onNavigate);
}

main();
