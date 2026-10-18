/* Folia PWA service worker: cache the app shell for offline use. */
const CACHE = 'folia-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // App navigation: serve the cached shell, fall back to network.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html')
        .then((r) => r || fetch(e.request))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Only handle same-origin static resources (audio blobs are object URLs, not fetched here).
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then((r) => {
      if (r) return r;
      return fetch(e.request).then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request));
    })
  );
});
