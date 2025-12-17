/**
 * MangaHook Service Worker
 * Lightweight caching for PWA shell only
 * DO NOT cache: cover images, API responses, chapter images
 */

const CACHE_NAME = 'mangahook-v1';
const SHELL_URLS = [
  '/',
  '/manifest.json',
  '/hat.png',
  '/loading.gif',
  '/manga-logo.webp',
];

// Install event - cache shell resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching shell resources');
        return cache.addAll(SHELL_URLS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache shell:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - network-first for API, cache-first for shell
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Network only for API calls - never cache API responses
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network only for cover images - too large and served from CDN
  if (url.pathname.includes('/cover-image/')) {
    return;
  }

  // Network only for external resources
  if (url.origin !== self.location.origin) {
    return;
  }

  // Cache-first for shell resources, network-first for everything else
  const isShellResource = SHELL_URLS.some((shellUrl) => 
    url.pathname === shellUrl || url.pathname.endsWith(shellUrl)
  );

  if (isShellResource) {
    // Cache-first strategy for shell
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached response and update cache in background
            fetchAndCache(event.request);
            return cachedResponse;
          }
          return fetchAndCache(event.request);
        })
        .catch(() => {
          // If both cache and network fail, return offline fallback for root
          if (url.pathname === '/') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        })
    );
  } else {
    // Network-first for other resources (pages, JS, CSS)
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200) {
            return response;
          }

          // Cache successful page navigations for offline support
          if (event.request.mode === 'navigate') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          // Try cache on network failure
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // For navigation requests, return the cached root page
              if (event.request.mode === 'navigate') {
                return caches.match('/');
              }
              return new Response('Offline', { status: 503 });
            });
        })
    );
  }
});

/**
 * Fetch and cache a request
 */
async function fetchAndCache(request) {
  try {
    const response = await fetch(request);
    
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});


