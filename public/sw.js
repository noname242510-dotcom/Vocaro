const CACHE_NAME = 'vocaro-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Hier kannst du später deine CSS oder Bilder-Namen ergänzen
];

// Installieren des Service Workers
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Dateien aus dem Cache laden (Offline-Modus)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});