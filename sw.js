
const CACHE = 'mequeda-shell-v4';

const FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key =>
            key.startsWith('mequeda-shell-') &&
            key !== CACHE
          )
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isAppPage =
    sameOrigin &&
    (event.request.mode === 'navigate' ||
     url.pathname.endsWith('/index.html') ||
     url.pathname.endsWith('/MeQueda/'));

  if (isAppPage) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE)
              .then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          return await caches.match(event.request) ||
                 await caches.match('./index.html');
        })
    );
    return;
  }

  const isManifest = url.pathname.endsWith('/manifest.json');
  const isIcon = /\/icon-(192|512)\.png$/.test(url.pathname);

  if (sameOrigin && (isManifest || isIcon)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE)
              .then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request);
    })
  );
});
