/* sw.js — a tiny service worker so the game works offline.
   Strategy: "stale-while-revalidate". Show the saved copy instantly, and
   quietly fetch a fresh copy in the background for next time. So when you
   replace a PNG, players see the new one on their second visit.
   Bump CACHE_NAME if you ever want to force-clear old copies. */
const CACHE_NAME = 'aloo-all-day-v10';
const CORE = ['./', 'index.html', 'css/style.css', 'js/config.js', 'js/game.js',
              'manifest.webmanifest', 'assets/aloo.png', 'assets/icon.png', 'assets/fonts/SoofSans.otf',
              'assets/ui/mix.png', 'assets/ui/reset.png', 'assets/ui/save.png', 'assets/ui/prev.png', 'assets/ui/next.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(e.request);
      const network = fetch(e.request).then((res) => {
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
