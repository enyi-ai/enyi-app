// Bump this on every meaningful change to force old clients to update.
const CACHE_NAME = 'enyi-cache-v2';

const urlsToCache = [
  '/favicon-96x96.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  // Don't wait for old tabs to close — activate the new SW immediately.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim()) // take control of open tabs right away
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // NETWORK-FIRST for navigation requests (index.html / app shell).
  // This guarantees the user always gets the latest HTML, which references
  // the correct, currently-deployed JS/CSS bundle hashes.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Keep a fallback copy in case the user goes offline later.
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // CACHE-FIRST for hashed static assets (JS/CSS/images) — these filenames
  // change on every build, so a cached old one is never wrongly served as new.
  if (
    url.origin === self.location.origin &&
    /\.(js|css|png|jpg|jpeg|svg|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        });
      })
    );
    return;
  }

  // Everything else (API calls, etc.) — just go to network, don't cache.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// Allow the page to tell a waiting SW to activate immediately.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
