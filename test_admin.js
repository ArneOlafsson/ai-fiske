const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
    const catchesRef = db.collection('catches');
    const q = catchesRef.orderBy('createdAt', 'desc').limit(5);
    const snap = await q.get();
    snap.forEach(doc => {
        console.log(doc.id, doc.data());
    });
}

run();
