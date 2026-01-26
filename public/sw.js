const CACHE_NAME = 'vocaro-v1';
// Wir cachen NUR die Startseite und das Manifest. 
// Das reicht völlig aus, damit die App offline startet!
const ASSETS = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Wenn Datei im Cache (offline), nimm sie. Sonst lade sie aus dem Netz.
      return response || fetch(event.request);
    })
  );
});