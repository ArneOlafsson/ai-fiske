'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/primitives';
import { Download } from 'lucide-react';

export default function InstallPwaButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
            setDeferredPrompt(null);
        } else {
            console.log('User dismissed the install prompt');
        }
    };

    if (!deferredPrompt) {
        // Om användaren redan har appen installerad eller om webbläsaren inte stödjer pwa / ios, visa ingenting
        return null;
    }

    return (
        <Button 
            onClick={handleInstallClick} 
            className="w-full sm:w-auto rounded-full text-lg px-8 py-6 font-bold text-white bg-accent hover:bg-accent/90 flex items-center justify-center gap-2 shadow-lg shadow-accent/25"
        >
            <Download className="w-5 h-5" />
            Installera som App
        </Button>
    );
}
