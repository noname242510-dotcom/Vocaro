const CACHE_NAME = 'vocaro-v2'; // Wir erhöhen die Version, um den Cache zu erzwingen
const ASSETS = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // Erzwingt, dass der neue SW sofort aktiv wird
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // Übernimmt sofort die Kontrolle
});

self.addEventListener('fetch', (event) => {
  // Verhindert Fehler bei Firebase-Uploads (POST)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Wenn im Cache, nimm es. Wenn nicht, lade aus dem Netz.
      // Falls Netzwerk fehlschlägt (Flugmodus), liefere die Startseite /
      return response || fetch(event.request).catch(() => caches.match('/'));
    })
  );
});