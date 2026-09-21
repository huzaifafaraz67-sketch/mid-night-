/* =============================================================================
   THE MIDNIGHT CURFEW  -  service worker
   Caches the game shell so it can be installed and played offline.
   The Three.js engine is loaded from a CDN; those requests are cached at
   runtime (stale-while-revalidate) after the first successful online load.
============================================================================= */
const CACHE = 'midnight-curfew-v4-1';

/* same-origin files that make up the installable game shell */
const CORE = [
  'midnight_curfew.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      /* don't fail the whole install if one optional file is missing */
      Promise.allSettled(CORE.map(url => cache.add(url)))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    /* cache-first for our own shell files */
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('midnight_curfew.html')))
    );
  } else {
    /* stale-while-revalidate for the CDN (Three.js modules) */
    event.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
