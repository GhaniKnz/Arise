/* ARISE service worker — offline shell. Data lives in IndexedDB, so the app works fully offline once cached. */
const VERSION = "arise-v1";
const SHELL = ["/", "/nutrition", "/nutrition/add", "/workout", "/session", "/progress", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API calls (AI, Open Food Facts proxy).
  if (url.pathname.startsWith("/api/")) return;

  // Immutable build assets and icons: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.match(/\.(woff2?|png|svg|jpg)$/)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Pages and RSC payloads: network first, fall back to cache (then to the home shell).
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.mode === "navigate" || url.searchParams.has("_rsc"))) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => (await caches.match(req)) || (req.mode === "navigate" ? await caches.match("/") : undefined) || Response.error()),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => "focus" in c);
      return client ? client.focus() : self.clients.openWindow("/session");
    }),
  );
});
