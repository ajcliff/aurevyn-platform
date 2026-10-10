// AUREVYN no longer uses a service worker. Browsers that still have an old one
// fetch this file, which clears its caches and removes it.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
  })());
});
