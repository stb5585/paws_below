const SHELL_CACHE = 'paws-below-shell-v10';
const RUNTIME_CACHE = 'paws-below-runtime-v10';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/paws-icon-192.png',
  './assets/paws-icon-512.png',
  './assets/title-animals.webp',
  './assets/menu-burrow.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(async () => {
        const keys = await caches.keys();
        if (keys.some(key => /^paws-below-v\d+$/.test(key))) await self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) void caches.open(SHELL_CACHE).then(cache => cache.put('./index.html', response.clone()));
          return response;
        })
        .catch(async () => (await caches.match('./index.html')) ?? Response.error())
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(RUNTIME_CACHE).then(cache => cache.put(event.request, copy));
      }
      return response;
    })).catch(() => Response.error())
  );
});
