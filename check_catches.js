const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "dummy",
    projectId: "ai-fiske-c9441",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkLatestCatches() {
    const catchesRef = collection(db, 'catches');
    const q = query(catchesRef, orderBy('createdAt', 'desc'), limit(5));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`Catch ID: ${doc.id}`);
        console.log(`Owner: ${data.ownerName}`);
        console.log(`Image URL: ${data.imageUrl}`);
        console.log(`Media Type: ${data.mediaType}`);
        console.log(`Created At: ${data.createdAt ? data.createdAt.toDate() : 'N/A'}`);
        console.log('-------------------');
    });
}

checkLatestCatches().catch(console.error);
