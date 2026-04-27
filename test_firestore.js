const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

// We need to fetch NEXT_PUBLIC_FIREBASE_API_KEY from .env.local
require('dotenv').config({ path: '.env.local' });

const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    projectId: 'ai-fiske-c9b20'
});
const db = getFirestore(app);

async function run() {
    try {
        const snap = await getDocs(query(collection(db, 'catches'), orderBy('createdAt', 'desc'), limit(10)));
        console.log('Total fetched:', snap.size);
        snap.docs.forEach(d => {
            const data = d.data();
            console.log(`ID: ${d.id} | isPublic: ${data.isPublic} | mediaType: ${data.mediaType} | createdAt:`, data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt);
        });
    } catch (e) {
        console.error(e);
    }
}
run();
