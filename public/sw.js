const CACHE_NAME = "tachocommand-shell-v52-app-beta-4";
const CORE_ASSETS = ["/", "/app", "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API and admin responses can contain session or account data even when
  // their HTTP headers say no-store. Never put them in Cache Storage.
  if (url.pathname === "/api" || url.pathname.startsWith("/api/") ||
      url.pathname === "/admin" || url.pathname.startsWith("/admin/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) event.waitUntil?.(caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, response.clone()))
            .catch(() => {}));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) event.waitUntil?.(caches.open(CACHE_NAME)
          .then((cache) => cache.put(request, response.clone()))
          .catch(() => {}));
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
