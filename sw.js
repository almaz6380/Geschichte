/* Service Worker: Precache aller App-Dateien, cache-first mit Netz-Fallback. */
const VERSION = 'wg-v14';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './datenschutz.html',
  './impressum.html',
  './privacy.html',
  './imprint.html',
  './css/base.css',
  './css/components.css',
  './css/timeline.css',
  './css/quiz.css',
  './css/games.css',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/data.js',
  './js/ui.js',
  './js/theme.js',
  './js/search.js',
  './js/quiz.js',
  './js/duel.js',
  './js/hotseat.js',
  './js/games.js',
  './js/daily.js',
  './js/cards.js',
  './js/share.js',
  './js/ads.js',
  './js/views/home.js',
  './js/views/epochs.js',
  './js/views/epoch.js',
  './js/views/event.js',
  './js/views/person.js',
  './js/views/timeline.js',
  './js/views/quiz.js',
  './js/views/search.js',
  './js/views/bookmarks.js',
  './js/views/notfound.js',
  './js/views/themes.js',
  './js/views/glossary.js',
  './js/views/regions.js',
  './js/views/more.js',
  './js/views/quizrunner.js',
  './js/views/duel.js',
  './js/views/hotseat.js',
  './js/views/games.js',
  './js/views/daily.js',
  './js/views/cards.js',
  './js/version.js',
  './js/i18n.js',
  './js/strings.js',
  './js/strings/de.js',
  './js/strings/en.js',
  './js/strings/fr.js',
  './js/strings/es.js',
  './js/strings/it.js',
  './js/strings/pt.js',
  './js/strings/ru.js',
  './js/strings/ja.js',
  './js/strings/zh.js',
  './js/strings/ko.js',
  './js/strings/tr.js',
  './js/strings/pl.js',
  './js/strings/nl.js',
  './js/strings/id.js',
  // Inhalte aller freigeschalteten Sprachen, damit ein Sprachwechsel auch offline klappt.
  './data/de/regions.json',
  './data/de/epochs.json',
  './data/de/events.json',
  './data/de/persons.json',
  './data/de/quiz.json',
  './data/de/glossary.json',
  './data/de/themes.json',
  './data/en/regions.json',
  './data/en/epochs.json',
  './data/en/events.json',
  './data/en/persons.json',
  './data/en/quiz.json',
  './data/en/glossary.json',
  './data/en/themes.json',
  './data/fr/regions.json',
  './data/fr/epochs.json',
  './data/fr/events.json',
  './data/fr/persons.json',
  './data/fr/quiz.json',
  './data/fr/glossary.json',
  './data/fr/themes.json',
  './data/es/regions.json',
  './data/es/epochs.json',
  './data/es/events.json',
  './data/es/persons.json',
  './data/es/quiz.json',
  './data/es/glossary.json',
  './data/es/themes.json',
  './data/it/regions.json',
  './data/it/epochs.json',
  './data/it/events.json',
  './data/it/persons.json',
  './data/it/quiz.json',
  './data/it/glossary.json',
  './data/it/themes.json',
  './data/pt/regions.json',
  './data/pt/epochs.json',
  './data/pt/events.json',
  './data/pt/persons.json',
  './data/pt/quiz.json',
  './data/pt/glossary.json',
  './data/pt/themes.json',
  './data/ru/regions.json',
  './data/ru/epochs.json',
  './data/ru/events.json',
  './data/ru/persons.json',
  './data/ru/quiz.json',
  './data/ru/glossary.json',
  './data/ru/themes.json',
  './data/zh/regions.json',
  './data/zh/epochs.json',
  './data/zh/events.json',
  './data/zh/persons.json',
  './data/zh/quiz.json',
  './data/zh/glossary.json',
  './data/zh/themes.json',
  './data/ko/regions.json',
  './data/ko/epochs.json',
  './data/ko/events.json',
  './data/ko/persons.json',
  './data/ko/quiz.json',
  './data/ko/glossary.json',
  './data/ko/themes.json',
  './data/tr/regions.json',
  './data/tr/epochs.json',
  './data/tr/events.json',
  './data/tr/persons.json',
  './data/tr/quiz.json',
  './data/tr/glossary.json',
  './data/tr/themes.json',
  './data/pl/regions.json',
  './data/pl/epochs.json',
  './data/pl/events.json',
  './data/pl/persons.json',
  './data/pl/quiz.json',
  './data/pl/glossary.json',
  './data/pl/themes.json',
  './data/nl/regions.json',
  './data/nl/epochs.json',
  './data/nl/events.json',
  './data/nl/persons.json',
  './data/nl/quiz.json',
  './data/nl/glossary.json',
  './data/nl/themes.json',
  './data/id/regions.json',
  './data/id/epochs.json',
  './data/id/events.json',
  './data/id/persons.json',
  './data/id/quiz.json',
  './data/id/glossary.json',
  './data/id/themes.json',
  './data/ja/regions.json',
  './data/ja/epochs.json',
  './data/ja/events.json',
  './data/ja/persons.json',
  './data/ja/quiz.json',
  './data/ja/glossary.json',
  './data/ja/themes.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('wg-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigationsanfragen: Eigene HTML-Seiten (Datenschutz, Impressum) direkt liefern,
  // sonst die App-Shell (Hash-Routing braucht keine Server-Routen).
  if (req.mode === 'navigate') {
    const isPage = /\/[^/]+\.html$/.test(url.pathname) && !url.pathname.endsWith('/index.html');
    event.respondWith(
      isPage
        ? caches.match(req, { ignoreSearch: true }).then((cached) => cached || fetch(req))
        : caches.match('./index.html').then((cached) => cached || fetch(req))
    );
    return;
  }

  // Inhalte (data/*.json): zuerst das Netz, damit neue Inhalte ohne Versionssprung
  // ankommen; offline oder bei Fehlern greift der Cache.
  if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
          return res;
        }
        return caches.match(req, { ignoreSearch: true }).then((cached) => cached || res);
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((cached) => cached || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
