/* Service Worker: Precache aller App-Dateien, cache-first mit Netz-Fallback. */
const VERSION = 'wg-v4';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './datenschutz.html',
  './impressum.html',
  './css/base.css',
  './css/components.css',
  './css/timeline.css',
  './css/quiz.css',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/data.js',
  './js/ui.js',
  './js/theme.js',
  './js/search.js',
  './js/quiz.js',
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
  './js/version.js',
  './js/i18n.js',
  './js/strings.js',
  './js/strings/de.js',
  './js/strings/en.js',
  './js/strings/fr.js',
  './js/strings/es.js',
  './js/strings/it.js',
  './js/strings/pt.js',
  // Nur die Standardsprache wird vorab gespeichert; weitere Sprachen landen beim
  // ersten Wechsel über die Laufzeit-Zwischenspeicherung im Cache.
  './data/de/regions.json',
  './data/de/epochs.json',
  './data/de/events.json',
  './data/de/persons.json',
  './data/de/quiz.json',
  './data/de/glossary.json',
  './data/de/themes.json',
  './icons/icon.svg',
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

  // Navigationsanfragen: App-Shell liefern (Hash-Routing braucht keine Server-Routen).
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => cached || fetch(req))
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
