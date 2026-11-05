import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

async function verifyLogin() {
    try {
        console.log("Testing login with test credentials...");
        const res = await signInWithEmailAndPassword(auth, "googleplay@bertlids.se", "BertlidReview2026!");
        console.log("SUCCESS: Logged in successfully!");
        console.log("UID:", res.user.uid);
        console.log("Email:", res.user.email);
        console.log("DisplayName:", res.user.displayName);

        const userDoc = await getDoc(doc(db, "users", res.user.uid));
        if (userDoc.exists()) {
            console.log("Firestore User Profile found:");
            console.log(JSON.stringify(userDoc.data(), null, 2));
        } else {
            console.log("Firestore User Profile: none (default)");
        }
        process.exit(0);
    } catch (e) {
        console.error("FAIL: Could not sign in:", e.message);
        process.exit(1);
    }
}

verifyLogin();
