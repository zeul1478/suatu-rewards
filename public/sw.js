// Customer app service worker (spec §3, §10). Deliberately small:
// - Pages always come from the network, so customers never see a stale app or balance.
// - When the network is gone, the store's offline page is shown instead of the browser's error.
// - Nothing else is cached; the browser's normal HTTP cache handles static files.
// Registered per store from src/components/customer/ServiceWorker.tsx with ?store=<slug>.

const store = new URL(self.location.href).searchParams.get("store");
const OFFLINE_URL = `/s/${store}/offline`;
const CACHE = `offline-${store}-v1`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(`offline-${store}-`) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()),
  );
});
