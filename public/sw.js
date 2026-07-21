const CACHE_NAME = "wnc-wallet-v1";
const STATIC_ASSETS = [
  '/', 
  '/index.html',
  '/styles/main.css',
  '/js/app.js'
];

// 1. INSTALL: Pre-cache your core UI shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// 2. ACTIVATE: Clean up old versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : null))
      )
    ])
  );
});

// 3. FETCH: The "Speed" Layer (Stale-While-Revalidate)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Update cache with fresh version in the background
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        return networkResponse;
      });

      // Return cache immediately (fast), or wait for network if not cached
      return cachedResponse || fetchPromise;
    })
  );
});

// 4. PUSH: The "Sentinel" Layer
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Wallet update detected.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Wallet Alert', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return clients.openWindow(event.notification.data.url);
    })
  );
});
