// AI Running Coach v15.6.104 · build 50704
'use strict';

const BUILD = 50704;
const CACHE_PREFIX = 'arc-v';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
      .then(async () => {
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });
        for (const client of clients) {
          client.postMessage({ type: 'ARC_BUILD_ACTIVE', build: BUILD });
        }
      })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Intentionally no fetch event handler.
// Browser navigation and assets load directly from GitHub Pages.
