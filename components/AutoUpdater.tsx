'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/primitives';

export default function AutoUpdater() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [currentVersion, setCurrentVersion] = useState<string | null>(null);

    useEffect(() => {
        // Only run in browser
        if (typeof window === 'undefined') return;

        const checkVersion = async () => {
            try {
                // Must add a cache-bust query param so the browser doesn't cache the API response
                const res = await fetch(`/api/version?t=${Date.now()}`);
                if (!res.ok) return;
                
                const data = await res.json();
                const fetchedVersion = data.version;

                if (!currentVersion) {
                    // First load, just set the currently loaded version
                    setCurrentVersion(fetchedVersion);
                } else if (fetchedVersion !== currentVersion) {
                    // Mismatch! An update has been deployed.
                    setUpdateAvailable(true);
                }
            } catch (err) {
                console.warn("Could not check for updates", err);
            }
        };

        // Check immediately after a small delay
        setTimeout(checkVersion, 2000);

        // Then check every 5 minutes (300000 ms)
        const intervalId = setInterval(checkVersion, 300000);

        // Also check when the user returns to the app from the background
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkVersion();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [currentVersion]);

    const handleUpdate = () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    registration.unregister();
                }
            });
        }
        window.location.reload();
    };

    if (!updateAvailable) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4">
            <div className="bg-primary text-primary-foreground shadow-xl rounded-full px-4 py-2 flex items-center gap-3 w-max max-w-[90vw]">
                <span className="text-sm font-medium">En ny uppdatering finns tillgänglig!</span>
                <Button size="sm" variant="secondary" onClick={handleUpdate} className="h-8 rounded-full">
                    <RefreshCw className="w-3 h-3 mr-2" /> Uppdatera nu
                </Button>
            </div>
        </div>
    );
}
