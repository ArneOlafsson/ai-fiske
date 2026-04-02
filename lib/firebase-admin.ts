import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : null;

// Export error for debugging
export let adminInitError: string | null = null;
let app: any;

try {
    if (serviceAccount) {
        app = getApps().length === 0 ? initializeApp({ credential: cert(serviceAccount) }) : getApps()[0];
    } else {
        // Attempt default credential (e.g. Cloud Functions env)
        try {
            const options = {
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ai-fiske-app-2026',
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'ai-fiske-app-2026.firebasestorage.app'
            };
            app = getApps().length === 0 ? initializeApp(options) : getApps()[0];
        } catch (innerError: any) {
            console.error("Failed to init admin app with default creds:", innerError);
            adminInitError = innerError?.message || String(innerError);
            throw innerError;
        }
    }
} catch (e: any) {
    console.error("CRITICAL: Firebase Admin Init Failed:", e);
    adminInitError = e?.message || String(e);
}

// Export admin instances. If init failed, these might throw or be undefined.
// We wrap them to fail gracefully or strict.
export const adminDb = app ? getFirestore(app) : null;
export const adminAuth = app ? getAuth(app) : null;
