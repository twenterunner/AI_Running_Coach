const CACHE='arc-v860-stable-8600';
const ASSETS=[
  './',
  './index.html',
  './styles.css?v=8600',
  './app.js?v=8600',
  './manifest.webmanifest?v=8600',
  './icon-192.png?v=8600',
  './icon-512.png?v=8600',
  './apple-touch-icon.png?v=8600',
  './favicon-32x32.png?v=8600',
  './favicon-16x16.png?v=8600',
  './favicon.ico?v=8600',
  './github-banner.png?v=8600'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, {cache:'no-store'})
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(event.request, {cache:'no-store'})
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
