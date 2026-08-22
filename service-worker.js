// AI Running Coach v15.6.7 · build 50607
'use strict';

const BUILD = 50607;
const CACHE = 'arc-v15606-build-50607';
const CACHE_PREFIX = 'arc-v';
const APP_SHELL = './index.html';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=50607',
  './app.js?v=50607',
  './manifest.webmanifest?v=50607',
  './icon-192.png?v=50607',
  './icon-512.png?v=50607',
  './apple-touch-icon.png?v=50607',
  './favicon-32x32.png?v=50607',
  './favicon-16x16.png?v=50607',
  './favicon.ico?v=50607',
  './shoe-images/dynablast-transparent.webp',
  './shoe-images/evoride-transparent.webp',
  './shoe-images/gel-cumulus-transparent.webp',
  './shoe-images/gel-kayano-transparent.webp',
  './shoe-images/gel-nimbus-transparent.webp',
  './shoe-images/gel-pulse-transparent.webp',
  './shoe-images/glideride-transparent.webp',
  './shoe-images/gt-1000-transparent.webp',
  './shoe-images/gt-2000-transparent.webp',
  './shoe-images/magic-speed-transparent.webp',
  './shoe-images/megablast-transparent.webp',
  './shoe-images/metaspeed-edge-transparent.webp',
  './shoe-images/metaspeed-ray-transparent.webp',
  './shoe-images/metaspeed-sky-transparent.webp',
  './shoe-images/noosa-tri-transparent.webp',
  './shoe-images/novablast-4-transparent.webp',
  './shoe-images/novablast-transparent.webp',
  './shoe-images/sonicblast-transparent.webp',
  './shoe-images/superblast-transparent.webp',
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
