// Origin PWA service worker.
// Strategy:
//   - /api/*            → never touched (always live network; auth + sync).
//   - static assets     → cache-first, revalidate in background.
//   - navigations/other → network-first, fall back to cache when offline.
// Bump VERSION to invalidate old caches on deploy.
const VERSION = "origin-v1";
const STATIC = `origin-static-${VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("origin-static-") && k !== STATIC)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|css|js)$/.test(pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API traffic — auth tokens and sync must always be live.
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
    return;
  }

  // Navigations and everything else: prefer fresh, fall back to cache offline.
  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        return res;
      } catch (err) {
        const cache = await caches.open(STATIC);
        const cached = await cache.match(req);
        if (cached) return cached;
        throw err;
      }
    })(),
  );
});
