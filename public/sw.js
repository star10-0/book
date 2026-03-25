const SW_VERSION = "book-v3";
const STATIC_CACHE = `${SW_VERSION}-static`;
const SHELL_CACHE = `${SW_VERSION}-shell`;

const APP_SHELL_ROUTES = ["/", "/books", "/offline"];
const STATIC_FILE_PATTERNS = [
  /\/(_next\/static)\//,
  /\.(?:css|js|mjs|woff2?|ttf|otf|svg|png|webmanifest)$/i,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ROUTES)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, SHELL_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  const path = url.pathname;
  const isApi = path.startsWith("/api/");
  const isUserOrAdminPage =
    path.startsWith("/account") ||
    path.startsWith("/admin") ||
    path.startsWith("/checkout") ||
    path.startsWith("/reader");

  if (isApi || isUserOrAdminPage) {
    return;
  }

  const isStaticAsset = STATIC_FILE_PATTERNS.some((pattern) => pattern.test(path));
  if (isStaticAsset) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }

  return response;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok && APP_SHELL_ROUTES.includes(new URL(request.url).pathname)) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    const exactMatch = await cache.match(request);
    if (exactMatch) {
      return exactMatch;
    }

    const offlinePage = await cache.match("/offline");
    if (offlinePage) {
      return offlinePage;
    }

    return cache.match("/");
  }
}
