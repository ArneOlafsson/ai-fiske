'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(
                    (registration) => {
                        console.log('Service Worker registration successful with scope: ', registration.scope);
                        
                        // Kolla regelbundet om det finns en ny version (varje timme)
                        setInterval(() => {
                            registration.update();
                        }, 1000 * 60 * 60);
                    },
                    (err) => {
                        console.log('Service Worker registration failed: ', err);
                    }
                );
            });

            // När en ny Service Worker tar över (via skipWaiting), ladda om sidan omedelbart
            // Detta garanterar att användaren direkt får den nya "färska" versionen av appen
            // utan att behöva stänga och öppna PWA:n manuellt.
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    console.log('Ny version upptäckt - Laddar om appen för att rensa cache!');
                    window.location.reload();
                }
            });
        }
    }, []);

    return null;
}
