// Service Worker for GoChul Fitness PWA
const CACHE_NAME = 'gochul-fitness-v2'; // Bumped version to force cache refresh
const RUNTIME_CACHE = 'gochul-runtime-v2'; // Bumped version to force cache refresh

// Check if we're on localhost
const isLocalhost =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '[::1]' ||
  self.location.hostname.includes('localhost');

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/contracts',
  '/history',
  '/profile',
  '/offline'
];

// Install event - precache essential assets
self.addEventListener('install', (event) => {
  // Skip caching on localhost
  if (isLocalhost) {
    console.log('[SW] Skipping cache on localhost');
    return self.skipWaiting();
  }

  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  // Clear all caches on localhost
  if (isLocalhost) {
    console.log('[SW] Clearing all caches on localhost');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            console.log('[SW] Deleting cache on localhost:', name);
            return caches.delete(name);
          })
        );
      }).then(() => self.clients.claim())
    );
    return;
  }

  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip caching on localhost - always fetch from network
  if (isLocalhost) {
    return;
  }

  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful API responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response(
              JSON.stringify({ error: 'Offline - cached data not available' }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // Static assets - network first for navigation, cache first for other assets
  event.respondWith(
    // Network first for HTML/navigation requests to always get latest UI
    (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html'))
      ? fetch(request)
        .then((response) => {
          // Cache the response
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/offline');
          });
        })
      : // Cache first for other static assets (JS, CSS, images)
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        }).catch(() => {
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/offline');
          }
        });
      })
  );
});

// Background sync for offline actions (optional)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Implement your sync logic here
      Promise.resolve()
    );
  }
});

// Push notifications (optional)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New update available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('GoChul Fitness', options)
  );
});

