self.addEventListener('install', (event) => {
    // Tvinga den nya service workern att ta över direkt
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Rensa ALLA gamla cacher för att garantera att användarna får den nya versionen!
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log('[ServiceWorker] Raderar gammal cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            // Tvinga service workern att ta kontroll över alla öppna flikar direkt
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Förbikoppla all form av cache i service workern - hämta ALLTID från nätverket.
    event.respondWith(
        fetch(event.request).catch(() => {
            return new Response("Appen kräver internetuppkoppling. Vänligen anslut till nätverket.", {
                status: 503,
                statusText: "Service Unavailable"
            });
        })
    );
});
