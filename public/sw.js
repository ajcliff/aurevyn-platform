// AUREVYN service worker.
// Deliberately minimal: it makes the app installable and gives a friendly offline page.
// It NEVER caches pages, API calls, Supabase traffic or anything user-specific, so it
// cannot serve stale data or another user's screens. Only immutable, content-hashed
// build files are cached, which are safe to keep forever.
const VERSION = "v1";
const STATIC_CACHE = `aurevyn-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll([OFFLINE_URL, "/pwa-192.png"])));
  // No automatic skipWaiting: a new version waits until the user taps "Refresh",
  // so the app never swaps code underneath someone mid-sale.
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("aurevyn-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // Supabase etc. go straight to network
  if (url.pathname.startsWith("/api/")) return;          // never touch API traffic

  // Page loads: always the network; only if it fails show the offline page
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Hashed build assets never change, so cache-first is safe and makes startup fast
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC_CACHE).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
