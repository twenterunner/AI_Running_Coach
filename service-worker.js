// AI Running Coach v14.9.47 · build 40947
'use strict';

const CACHE = 'arc-v14945-build-40947';
const CACHE_PREFIX = 'arc-v';
const APP_SHELL = './index.html';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=40947',
  './app.js?v=40947',
  './manifest.webmanifest?v=40947',
  './icon-192.png?v=40947',
  './icon-512.png?v=40947',
  './apple-touch-icon.png?v=40947',
  './favicon-32x32.png?v=40947',
  './favicon-16x16.png?v=40947',
  './favicon.ico?v=40947'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
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

  const iconAssets = new Set([
    '/AI_Running_Coach/icon-192.png',
    '/AI_Running_Coach/icon-512.png',
    '/AI_Running_Coach/apple-touch-icon.png',
    '/AI_Running_Coach/favicon-32x32.png',
    '/AI_Running_Coach/favicon-16x16.png',
    '/AI_Running_Coach/favicon.ico'
  ]);
  if (iconAssets.has(url.pathname)) {
    const fresh = new URL(request.url);
    fresh.search = '?v=40947';
    event.respondWith(networkFirst(new Request(fresh.toString(), request)));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, APP_SHELL));
    return;
  }

  event.respondWith(networkFirst(request));
});
