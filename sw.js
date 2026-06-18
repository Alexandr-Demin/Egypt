// EGYPT service worker — network-first, fallback to cache.
// Cache lookup ignores the ?v=... cache-buster; never masks network errors.
const CACHE = 'egypt-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles/style.css',
  './src/main.js',
  './assets/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for all GET requests: always return a valid Response, never undefined.
// On offline, fall back to cache if present.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  // On localhost the SW stays out of the way — dev must see real network errors.
  const host = self.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return;
  e.respondWith((async () => {
    try {
      const resp = await fetch(e.request);
      if (resp && resp.ok && resp.status === 200){
        const cache = await caches.open(CACHE);
        cache.put(e.request, resp.clone()).catch(() => {});
      }
      return resp;
    } catch (err) {
      const cached =
        (await caches.match(e.request)) ||
        (await caches.match(e.request, { ignoreSearch: true }));
      if (cached) return cached;
      throw err;
    }
  })());
});
