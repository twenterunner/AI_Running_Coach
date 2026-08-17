// AI Running Coach v14.4.8 · build 40408
'use strict';

const CACHE = 'arc-v1448-build-40408';
const CACHE_PREFIX = 'arc-v';
const APP_SHELL = './index.html';
const ASSETS = [
  './', './index.html', './styles.css?v=40408-transactional-race-nav', './app.js?v=40408-transactional-race-nav', './manifest.webmanifest?v=40408'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

async function navigationResponse(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok && response.type === 'basic') await (await caches.open(CACHE)).put(APP_SHELL, response.clone());
    return response;
  } catch {
    return (await caches.match(APP_SHELL)) || Response.error();
  }
}

async function sameOriginAsset(request, event) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok && response.type === 'basic') await (await caches.open(CACHE)).put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') event.respondWith(navigationResponse(request));
  else event.respondWith(sameOriginAsset(request, event).catch(() => caches.match(request).then(response => response || Response.error())));
});
