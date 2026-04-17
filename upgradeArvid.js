const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin (adjust the credential path as needed, or use default)
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : undefined; 
  
if (!admin.apps.length) {
    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        admin.initializeApp(); // Assuming GOOGLE_APPLICATION_CREDENTIALS is set
    }
}

const db = admin.firestore();
const auth = admin.auth();

async function run() {
    try {
        const email = 'arvid.bertlid@icloud.com';
        const userRecord = await auth.getUserByEmail(email);
        console.log(`Found user: ${userRecord.uid}`);
        
        const endOf2026 = new Date('2026-12-31T23:59:59');
        await db.collection('users').doc(userRecord.uid).set({
            isPremium: true,
            premiumType: 'lifetime',
            premiumSince: admin.firestore.FieldValue.serverTimestamp(),
            premiumExpiresAt: endOf2026,
            stripePaymentStatus: 'paid',
            stripeSessionId: 'manual',
            aiQuotaTotal: 1000,
            lastUpdatedBy: 'manual_script',
            email: email, // just to enforce
        }, { merge: true });
        
        console.log(`Successfully upgraded user ${email}`);
    } catch (error) {
        console.error("Error:", error.message);
        
        // Maybe the user document just needs to be created, or user doesn't exist in Auth.
        // Let's create user if they don't exist? (Usually they have created one).
    }
}

run();
