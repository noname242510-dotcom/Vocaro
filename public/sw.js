const CACHE_NAME = 'vocaro-v1';
// Nur Dateien auflisten, die wirklich im /public Ordner existieren!
const ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png' // Stelle sicher, dass dieses Bild in /public liegt!
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Wir nutzen .add() statt .addAll() oder fangen Fehler ab
      return Promise.all(
        ASSETS.map(url => {
          return cache.add(url).catch(err => console.log('Cache-Fehler für:', url, err));
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});