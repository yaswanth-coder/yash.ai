// Yash.AI Production Service Worker for PWA
const CACHE_NAME = "yash-ai-cache-v2";

// Static assets pre-cached on install
const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/manifest.json",
  "/favicon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/icons/apple-touch-icon.png",
];

// Install Event - Pre-cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("[SW] Pre-cache warning:", err))
  );
});

// Activate Event - Clean up old caches & take control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch Event - Smart routing strategy with strict bypass for dynamic AI/API streams
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Only handle GET requests (bypasses POST, PUT, DELETE, PATCH, file uploads)
  if (request.method !== "GET") {
    return;
  }

  // 2. Bypass API calls, websockets, backend proxies, streaming AI responses, auth, uploads
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/chat/") ||
    url.pathname.startsWith("/upload/") ||
    url.pathname.startsWith("/files/") ||
    url.pathname.startsWith("/stream/") ||
    url.port === "8000" ||
    url.protocol.startsWith("ws") ||
    request.headers.get("accept")?.includes("text/event-stream")
  ) {
    return;
  }

  // 3. Navigation requests: Network-First with Cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootCached = await caches.match("/");
          if (rootCached) return rootCached;
          return new Response("Offline - Yash.AI", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        })
    );
    return;
  }

  // 4. Static assets (images, icons, fonts, CSS/JS bundles): Stale-While-Revalidate or Cache-First
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|css|js|webmanifest|json)$/) ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});
