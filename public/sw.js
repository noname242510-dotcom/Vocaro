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
  // Wir fangen nur GET-Anfragen ab (Seitenaufrufe, Bilder)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Wenn wir es im Cache haben (z.B. die App-Hülle), nimm das.
      // Ansonsten versuche es aus dem Netzwerk.
      return cachedResponse || fetch(event.request).catch(() => {
        // Wenn beides fehlschlägt (offline & nicht im Cache), 
        // könnten wir hier eine /offline Seite anzeigen.
        return caches.match('/'); 
      });
    })
  );
});