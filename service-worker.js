const CACHE='arc-v851-stable-8510';
const ASSETS=[
  './',
  './index.html',
  './styles.css?v=8510',
  './app.js?v=8510',
  './manifest.webmanifest?v=8510',
  './icon-192.png?v=8510',
  './icon-512.png?v=8510',
  './apple-touch-icon.png?v=8510',
  './favicon-32x32.png?v=8510',
  './favicon-16x16.png?v=8510',
  './favicon.ico?v=8510',
  './github-banner.png?v=8510'
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
