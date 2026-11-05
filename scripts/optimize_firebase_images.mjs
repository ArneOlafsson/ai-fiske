import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, query, orderBy, limit } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import sharp from "sharp";

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
const storage = getStorage(app);

async function optimizeCollection(collectionName, maxDocs = 50) {
  console.log(`\n=== Optimerar bilder i '${collectionName}' ===`);
  const colRef = collection(db, collectionName);
  const q = query(colRef, orderBy("createdAt", "desc"), limit(maxDocs));
  const snap = await getDocs(q);

  let savedBytes = 0;
  let optimizedCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const url = data.imageUrl;
    if (!url || !url.startsWith("http")) continue;

    try {
      const headRes = await fetch(url, { method: "HEAD" });
      const contentLen = Number(headRes.headers.get("content-length") || 0);

      // Om bilden redan är under 320 KB, hoppa över
      if (contentLen > 0 && contentLen < 320 * 1024) {
        console.log(`  [OK] ${docSnap.id} är redan liten (${Math.round(contentLen / 1024)} KB)`);
        continue;
      }

      const imgRes = await fetch(url);
      if (!imgRes.ok) continue;
      const arrayBuf = await imgRes.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuf);

      const optimizedBuffer = await sharp(inputBuffer)
        .rotate() // Bevara EXIF-rotation från kameran
        .resize({
          width: 1080,
          height: 1080,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();

      const oldKb = Math.round(inputBuffer.length / 1024);
      const newKb = Math.round(optimizedBuffer.length / 1024);

      if (optimizedBuffer.length >= inputBuffer.length * 0.85) {
        console.log(`  [SKIP] ${docSnap.id} (${oldKb} KB -> ${newKb} KB)`);
        continue;
      }

      const uid = auth.currentUser.uid;
      const storagePath = `equipment/${uid}/opt2027_${collectionName}_${docSnap.id}.jpg`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, optimizedBuffer, {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000",
      });

      const newUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, collectionName, docSnap.id), {
        imageUrl: newUrl,
        originalImageUrl: data.originalImageUrl || url,
      });

      savedBytes += inputBuffer.length - optimizedBuffer.length;
      optimizedCount++;
      console.log(`  [OPTIMERAD] ${docSnap.id}: ${oldKb} KB -> ${newKb} KB (-${Math.round((1 - newKb / oldKb) * 100)}%)`);
    } catch (err) {
      console.error(`  [FEL] ${docSnap.id}:`, err.message);
    }
  }

  console.log(`Klar med '${collectionName}': ${optimizedCount} bilder optimerade, sparade ${Math.round(savedBytes / 1024 / 1024)} MB!`);
}

async function run() {
  try {
    const cred = await signInWithEmailAndPassword(auth, "googleplay@bertlids.se", "BertlidReview2026!");
    await setDoc(doc(db, "users", cred.user.uid), { role: "admin" }, { merge: true });
    console.log("Inloggad i Firebase Auth som admin:", cred.user.uid);
  } catch (e) {
    console.warn("Auth info:", e.message);
  }

  await optimizeCollection("catches", 150);
  await optimizeCollection("equipment", 50);
  process.exit(0);
}

run();
