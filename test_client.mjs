import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCVRK8ySXFCg28eDKgYnt6_YCV9YGMDues",
    authDomain: "ai-fiske-app-2026.firebaseapp.com",
    projectId: "ai-fiske-app-2026",
    storageBucket: "ai-fiske-app-2026.firebasestorage.app",
    messagingSenderId: "914791790856",
    appId: "1:914791790856:web:4a46263aac2aa04523d4bd",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
    try {
        await signInWithEmailAndPassword(auth, "arne@olafsson.se", "Arne123!");
        console.log("Logged in!");
        
        const q = query(collection(db, "catches"), orderBy("createdAt", "desc"), limit(10));
        const snap = await getDocs(q);
        snap.forEach(doc => {
            const data = doc.data();
            console.log(doc.id, " - ", data.ownerName, " - ", data.createdAt?.toDate(), " - ", data.mediaType);
        });
    } catch (e) {
        console.error("Error", e);
    }
}

run();
