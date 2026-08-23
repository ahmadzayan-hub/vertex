/**
 * VERTEX service worker.
 * Strategy:
 *   - Precache the offline shell (index, icon, manifest).
 *   - Runtime: network-first for navigation, cache-first for static assets.
 * Not a comprehensive offline experience. Enough so the app opens instantly
 * on repeat visits and shows a graceful offline shell when the network
 * is down.
 */
const VERSION = 'v1';
const SHELL_CACHE = `vertex-shell-${VERSION}`;
const RUNTIME_CACHE = `vertex-runtime-${VERSION}`;
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-touch-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation: network first, fall back to cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: cache first with background refresh.
  if (/\.(css|js|svg|png|jpg|jpeg|webp|woff2?|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
