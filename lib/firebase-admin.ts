import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : null;

let app;

try {
    if (serviceAccount) {
        app = getApps().length === 0 ? initializeApp({ credential: cert(serviceAccount) }) : getApp();
    } else {
        // Attempt default credential (e.g. Cloud Functions env) or Mock
        app = getApps().length === 0 ? initializeApp() : getApp();
    }
} catch (e) {
    console.warn("Firebase Admin Init Error (Ignore in basic local dev without creds):", e);
}

// Export admin instances. If init failed, these might throw or be undefined.
// We wrap them to fail gracefully or strict.
export const adminDb = app ? getFirestore(app) : null;
export const adminAuth = app ? getAuth(app) : null;
