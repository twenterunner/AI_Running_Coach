// AI Running Coach v15.6.5 · build 50605
'use strict';

const BUILD = 50605;
const CACHE = 'arc-v15605-build-50605';
const CACHE_PREFIX = 'arc-v';
const APP_SHELL = './index.html';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=50605',
  './app.js?v=50605',
  './manifest.webmanifest?v=50605',
  './icon-192.png?v=50605',
  './icon-512.png?v=50605',
  './apple-touch-icon.png?v=50605',
  './favicon-32x32.png?v=50605',
  './favicon-16x16.png?v=50605',
  './favicon.ico?v=50605',
  './shoe-images/dynablast-transparent.png?v=50605',
  './shoe-images/evoride-transparent.png?v=50605',
  './shoe-images/gel-cumulus-transparent.png?v=50605',
  './shoe-images/gel-kayano-transparent.png?v=50605',
  './shoe-images/gel-nimbus-transparent.png?v=50605',
  './shoe-images/gel-pulse-transparent.png?v=50605',
  './shoe-images/glideride-transparent.png?v=50605',
  './shoe-images/gt-1000-transparent.png?v=50605',
  './shoe-images/gt-2000-transparent.png?v=50605',
  './shoe-images/magic-speed-transparent.png?v=50605',
  './shoe-images/megablast-transparent.png?v=50605',
  './shoe-images/metaspeed-edge-transparent.png?v=50605',
  './shoe-images/metaspeed-ray-transparent.png?v=50605',
  './shoe-images/metaspeed-sky-transparent.png?v=50605',
  './shoe-images/noosa-tri-transparent.png?v=50605',
  './shoe-images/novablast-4-transparent.png?v=50605',
  './shoe-images/novablast-transparent.png?v=50605',
  './shoe-images/sonicblast-transparent.png?v=50605',
  './shoe-images/superblast-transparent.png?v=50605'
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
