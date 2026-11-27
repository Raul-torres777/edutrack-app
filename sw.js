const CACHE_NAME = 'edutrack-pwa-v17';
const NETWORK_TIMEOUT_MS = 4000;
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './db.js',
  './mock_data.js',
  './supabase.js',
  './manifest.json',
  './icon-192.png?v=2',
  './icon-512.png?v=2'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[PWA SW] Pre-guardando recursos estáticos...');
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[PWA SW] Algunos recursos fallaron al pre-guardar:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[PWA SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia Network-First con timeout y fallback a Caché
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);

  event.respondWith(
    fetch(event.request, { signal: controller.signal })
      .then(networkResponse => {
        clearTimeout(timeoutId);
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        clearTimeout(timeoutId);
        return caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html', { ignoreSearch: true });
          }
        });
      })
  );
});
