const CACHE_NAME = 'paws-below-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/paws-icon.svg',
  './assets/paws-icon-192.png',
  './assets/paws-icon-512.png',
  './assets/title-burrow.png',
  './assets/menu-burrow-v2.png',
  './assets/pip-animations-v2.png',
  './assets/burrow-atlas-v2.png',
  './assets/household-treasures-v2.png',
  './assets/burrow-map.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match('./index.html')))
  );
});
