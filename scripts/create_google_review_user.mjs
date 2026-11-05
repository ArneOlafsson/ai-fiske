import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

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

const EMAIL = "googleplay@bertlids.se";
const PASSWORD = "BertlidReview2026!";
const DISPLAY_NAME = "Google Reviewer";

async function createReviewUser() {
    let user;
    try {
        console.log(`Attempting to create user ${EMAIL}...`);
        const userCredential = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
        user = userCredential.user;
        console.log(`Created user ${EMAIL} with UID: ${user.uid}`);
    } catch (err) {
        if (err.code === "auth/email-already-in-use") {
            console.log("User already exists, signing in to verify password and update profile...");
            const userCredential = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
            user = userCredential.user;
            console.log(`Signed in successfully with UID: ${user.uid}`);
        } else {
            console.error("Error creating/authenticating user:", err);
            process.exit(1);
        }
    }

    try {
        await updateProfile(user, { displayName: DISPLAY_NAME });
        console.log(`Updated display name to "${DISPLAY_NAME}"`);

        // Set user record in Firestore
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
            email: EMAIL,
            displayName: DISPLAY_NAME,
            isPremium: true,
            premiumType: "review_account",
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            aiQuotaTotal: 500,
            aiQuotaUsed: 0
        }, { merge: true });

        console.log("Successfully set user profile & premium status in Firestore!");
        console.log("-----------------------------------------");
        console.log("TEST ACCOUNT READY:");
        console.log(`Email:    ${EMAIL}`);
        console.log(`Password: ${PASSWORD}`);
        console.log("-----------------------------------------");
    } catch (err) {
        console.error("Error setting Firestore document:", err);
    }
}

createReviewUser();
