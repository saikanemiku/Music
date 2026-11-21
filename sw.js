// Service worker: guarda la app en el teléfono para que abra sin conexión.
const CACHE = 'miplayer-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // primero la red (así siempre ves la versión nueva); si no hay conexión o tarda, la copia guardada
  e.respondWith(
    new Promise((resolve) => {
      let done = false;
      const fromCache = () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'));
      const timer = setTimeout(() => { if (!done) fromCache().then((h) => { if (h && !done) { done = true; resolve(h); } }); }, 4000);
      fetch(req, { cache: 'no-cache' }).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        if (!done) { done = true; clearTimeout(timer); resolve(res); }
      }).catch(() => { fromCache().then((h) => { if (!done) { done = true; clearTimeout(timer); resolve(h || Response.error()); } }); });
    })
  );
});
