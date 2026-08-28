const VERSION = 'takebook-v1';
const SHELL = [
  '/', '/?source=pwa&v=1', '/offline.html', '/privacy/', '/terms/', '/manifest.webmanifest',
  '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png',
  '/assets/space-grotesk.woff2', '/assets/atkinson.woff2',
  '/assets/takebook-kiosk-960.webp', '/assets/takebook-kiosk-1440.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => { const copy=response.clone();caches.open(VERSION).then(cache=>cache.put(request,copy));return response; }).catch(async()=>await caches.match(request)||await caches.match('/')||await caches.match('/offline.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => { if(response.ok){const copy=response.clone();caches.open(VERSION).then(cache=>cache.put(request,copy));} return response; })));
});

self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
