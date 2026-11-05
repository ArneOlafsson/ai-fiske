const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyCVRK8ySXFCg28eDKgYnt6_YCV9YGMDues",
    authDomain: "ai-fiske-app-2026.firebaseapp.com",
    projectId: "ai-fiske-app-2026",
    storageBucket: "ai-fiske-app-2026.firebasestorage.app",
    messagingSenderId: "914791790856",
    appId: "1:914791790856:web:4a46263aac2aa04523d4bd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    try {
        const catchesRef = collection(db, 'catches');
        const q = query(catchesRef, limit(10));
        const snap = await getDocs(q);
        console.log(`Found ${snap.size} catches.`);
        snap.forEach(doc => {
            const d = doc.data();
            console.log(JSON.stringify({
                id: doc.id,
                ownerName: d.ownerName,
                imageUrl: d.imageUrl,
                locationText: d.locationText,
                fishNameSv: d.aiResult?.fishNameSv,
                comment: d.comment
            }, null, 2));
        });
    } catch (err) {
        console.error("Firestore error:", err);
    }
}

run();
