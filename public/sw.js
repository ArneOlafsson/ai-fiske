self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Basic pass-through fetch handler to satisfy PWA installability requirements
    // This makes Chrome mint a modern WebAPK which passes Google Play Protect.
    event.respondWith(fetch(event.request).catch(() => {
        return new Response("Offline mode not fully supported yet.", {
            status: 503,
            statusText: "Service Unavailable"
        });
    }));
});
