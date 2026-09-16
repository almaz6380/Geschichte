import { loadData } from './data.js';
import { addRoute, startRouter, rerender } from './router.js';
import { applyTheme, cycleTheme, themeLabel } from './theme.js';
import { handleBookmarkClick, showToast, esc } from './ui.js';
import { READY_LANGS, DEFAULT_LANG, t, setLang, getLang, detectLang } from './i18n.js';
import { getLangPref, setLangPref } from './store.js';
import * as home from './views/home.js';
import * as epochs from './views/epochs.js';
import * as epoch from './views/epoch.js';
import * as event from './views/event.js';
import * as person from './views/person.js';
import * as timeline from './views/timeline.js';
import * as quiz from './views/quiz.js';
import * as search from './views/search.js';
import * as bookmarks from './views/bookmarks.js';
import * as themes from './views/themes.js';
import * as glossary from './views/glossary.js';
import * as regions from './views/regions.js';
import * as more from './views/more.js';
import * as notfound from './views/notfound.js';



export const IS_NATIVE = !!(window.Capacitor?.isNativePlatform?.() || document.documentElement.dataset.native === '1');
window.wgIsNative = IS_NATIVE;
if (IS_NATIVE) document.documentElement.classList.add('native');

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
addRoute('/themen', themes.renderList);
addRoute('/thema/:id', themes.renderDetail);
addRoute('/glossar', glossary.render);
addRoute('/glossar/:id', glossary.render);
addRoute('/regionen', regions.renderList);
addRoute('/region/:id', regions.renderDetail);
addRoute('/mehr', more.render);

const NAV_KEY = {
  '': 'home', epochen: 'epochen', epoche: 'epochen', ereignis: 'epochen', person: 'epochen',
  zeitleiste: 'zeitleiste', quiz: 'quiz', suche: 'suche', lesezeichen: 'lesezeichen',
  themen: 'themen', thema: 'themen', glossar: 'glossar', regionen: 'mehr', region: 'mehr', mehr: 'mehr',
};
// Auf dem Handy liegen Themen/Glossar/Suche/Lesezeichen unter "Mehr".
const MOBILE_MORE = new Set(['themen', 'glossar', 'suche', 'lesezeichen', 'mehr']);

function markNav(path) {
  const key = NAV_KEY[path[0] || ''] || '';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const inBottom = a.closest('.bottom-nav');
    const active = a.dataset.nav === key || (inBottom && a.dataset.nav === 'mehr' && MOBILE_MORE.has(key));
    if (active) a.setAttribute('aria-current', 'page');
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
    view.innerHTML = `<div class="empty card"><h2>${esc(t('app.error'))}</h2><p>${esc(err.message)}</p></div>`;
  }
}

function setupTheme() {
  applyTheme();
  document.getElementById('theme-btn')?.addEventListener('click', () => {
    const next = cycleTheme();
    showToast(t('theme.toast', { name: themeLabel(next) }));
  });
}

function setupInstall() {
  const btn = document.getElementById('install-btn');
  let deferred = null;
  if (IS_NATIVE) { window.wgInstall = { available: () => false, prompt: async () => {} }; return; }
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
  window.addEventListener('appinstalled', () => { btn.hidden = true; deferred = null; showToast(t('app.installed')); });
}

function setupServiceWorker() {
  if (IS_NATIVE) return;
  if (!('serviceWorker' in navigator)) return;
  if (!/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showToast(t('app.update.available'), { action: t('app.update.action'), onAction: () => location.reload(), sticky: true });
          }
        });
      });
    } catch (err) {
      console.warn('Service Worker konnte nicht registriert werden:', err);
    }
  });
}

// Statische Texte in index.html übersetzen.
function applyStaticTexts() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.setAttribute('title', t(el.dataset.i18nTitle)); });
  document.querySelectorAll('[data-i18n-content]').forEach((el) => { el.setAttribute('content', t(el.dataset.i18nContent)); });
  document.title = t('app.name');
}

// Lädt die Inhalte der aktuellen Sprache. Fehlt eine Übersetzung noch, greift Deutsch.
async function loadLanguageData() {
  try {
    await loadData(`./data/${getLang()}/`);
  } catch (err) {
    if (getLang() === DEFAULT_LANG) throw err;
    console.warn(`Inhalte für "${getLang()}" nicht verfügbar, es wird Deutsch geladen.`, err);
    setLang(DEFAULT_LANG);
    await loadData(`./data/${DEFAULT_LANG}/`);
  }
}

function setupLangPicker() {
  const sel = document.getElementById('lang-select');
  if (!sel) return;
  sel.innerHTML = READY_LANGS.map((l) => `<option value="${l.code}">${esc(l.name)}</option>`).join('');
  sel.value = getLang();
  sel.addEventListener('change', async () => {
    const code = sel.value;
    setLangPref(code);
    setLang(code);
    sel.value = getLang();
    try {
      await loadLanguageData();
    } catch (err) {
      console.error(err);
      showToast(t('app.loadFailed'));
      return;
    }
    sel.value = getLang();
    applyStaticTexts();
    rerender();
  });
}

async function main() {
  setLang(getLangPref() || detectLang());
  applyStaticTexts();
  setupTheme();
  setupInstall();
  setupServiceWorker();
  setupLangPicker();
  document.addEventListener('click', (e) => { handleBookmarkClick(e); });
  try {
    await loadLanguageData();
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty card"><h2>${esc(t('app.loadFailed'))}</h2><p>${esc(err.message)}</p><button class="btn btn-primary" onclick="location.reload()">${esc(t('app.retry'))}</button></div>`;
    return;
  }
  startRouter(onNavigate);
}

main();
