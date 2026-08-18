// AI Running Coach v14.8.4 · build 40804
'use strict';

const CACHE = 'arc-v1484-build-40804';
const CACHE_PREFIX = 'arc-v';
const APP_SHELL = './index.html';
const ASSETS = [
  './', './index.html', './styles.css?v=40804-strict-prerace', './app.js?v=40804-strict-prerace', './manifest.webmanifest?v=40804'
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
