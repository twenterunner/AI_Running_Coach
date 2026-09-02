// AI Running Coach v15.6.108 · build 50708
'use strict';

const BUILD = 50708;
const CACHE = 'arc-v156108-build-50708';
const CACHE_PREFIX = 'arc-v';
const APP_SHELL = './index.html';
const ASSETS = [
  './index.html',
  './styles.css?v=50708',
  './app.js?v=50708',
  './manifest.webmanifest?v=50708',
  './icon-192.png?v=50708',
  './icon-512.png?v=50708',
  './apple-touch-icon.png?v=50708',
  './favicon-32x32.png?v=50708',
  './favicon-16x16.png?v=50708',
  './favicon.ico?v=50708',
  './startup-icon.png?v=50708'
];

function cacheRequest(value) {
  return value instanceof Request ? value : new Request(new URL(String(value), self.location.href));
}

async function resilientPrecache() {
  const cache = await caches.open(CACHE);
  await Promise.allSettled(ASSETS.map(async asset => {
    const request = new Request(new URL(asset, self.location.href), { cache: 'reload' });
    const response = await fetch(request);
    if (response && response.ok && response.type !== 'opaque') await cache.put(request, response.clone());
  }));
}

self.addEventListener('install', event => {
  event.waitUntil(resilientPrecache().finally(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(async () => {
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) client.postMessage({ type: 'ARC_BUILD_ACTIVE', build: BUILD });
      })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request, fallbackKey = null) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok && response.type !== 'opaque') {
      const cache = await caches.open(CACHE);
      await cache.put(cacheRequest(fallbackKey || request), response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(cacheRequest(fallbackKey || request));
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && response.type !== 'opaque') {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, APP_SHELL));
    return;
  }

  const isCode = ['script', 'style', 'worker', 'manifest'].includes(request.destination) || /\.(?:js|css|json|webmanifest)$/i.test(url.pathname);
  if (isCode) {
    event.respondWith(networkFirst(request, request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
