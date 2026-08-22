// AI Running Coach v15.4.8 · build 50408
'use strict';

const BUILD = 50408;
const CACHE = 'arc-v15408-build-50408';
const CACHE_PREFIX = 'arc-v';
const APP_SHELL = './index.html';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=50408',
  './app.js?v=50408',
  './manifest.webmanifest?v=50408',
  './icon-192.png?v=50408',
  './icon-512.png?v=50408',
  './apple-touch-icon.png?v=50408',
  './favicon-32x32.png?v=50408',
  './favicon-16x16.png?v=50408',
  './favicon.ico?v=50408'
];

async function resilientPrecache() {
  const cache = await caches.open(CACHE);
  await Promise.allSettled(ASSETS.map(async asset => {
    const request = new Request(asset, { cache: 'reload' });
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
  }));
}

self.addEventListener('install', event => {
  event.waitUntil(
    resilientPrecache().finally(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request, fallback) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE);
      await cache.put(fallback || request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(fallback || request)) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    const fresh = new URL(request.url);
    fresh.searchParams.set('build', String(BUILD));
    event.respondWith(networkFirst(new Request(fresh.toString(), request), APP_SHELL));
    return;
  }

  if (/\.(?:js|css|webmanifest)$/i.test(url.pathname)) {
    const fresh = new URL(request.url);
    fresh.searchParams.set('v', String(BUILD));
    event.respondWith(networkFirst(new Request(fresh.toString(), request), request));
    return;
  }

  event.respondWith(networkFirst(request));
});
