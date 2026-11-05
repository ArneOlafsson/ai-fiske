/**
 * Skript för att förlänga medlemskap för användare som betalat under Q4 2026 (okt-dec)
 * så att deras årskort gäller hela 2027 ut (2027-12-31).
 * 
 * Körning:
 *   node scripts/extend_q4_users_to_2027.js --dry-run   (Visar vilka som berörs utan att ändra)
 *   node scripts/extend_q4_users_to_2027.js --apply     (Verkställer ändringen i Firestore)
 */

const admin = require('firebase-admin');
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const isApply = process.argv.includes('--apply');
const isDryRun = !isApply;

// Initiera Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ai-fiske-app-2026'
    });
}

const db = admin.firestore();

// Initiera Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
    console.error("Fel: STRIPE_SECRET_KEY saknas i .env.local");
    process.exit(1);
}
const stripe = new Stripe(stripeKey);

// Datumgränser
// Q4 start: 2026-10-01 00:00:00 UTC
const Q4_START_TIMESTAMP = Math.floor(new Date('2026-10-01T00:00:00Z').getTime() / 1000);
const END_OF_2027 = new Date('2027-12-31T23:59:59.000Z');

async function main() {
    console.log("==================================================================");
    console.log("🎣 FISKEAPPEN: Förlängning av Q4 2026-betalningar till slutet av 2027");
    console.log(`Läge: ${isDryRun ? '🔍 DRY RUN (Simulering, inga ändringar skrivs)' : '⚡ APPLY (Verkställer uppdateringar i Firestore)'}`);
    console.log(`Från datum: 2026-10-01`);
    console.log(`Nytt slutdatum: 2027-12-31 23:59:59`);
    console.log("==================================================================\n");

    // 1. Hämta alla betalda sessioner från Stripe sedan 1 okt 2026
    console.log("Steg 1: Hämtar betalningar från Stripe sedan 1 oktober 2026...");
    let allSessions = [];
    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
        const response = await stripe.checkout.sessions.list({
            created: { gte: Q4_START_TIMESTAMP },
            limit: 100,
            starting_after: startingAfter
        });

        allSessions = allSessions.concat(response.data);
        hasMore = response.has_more;
        if (response.data.length > 0) {
            startingAfter = response.data[response.data.length - 1].id;
        }
    }

    const paidSessions = allSessions.filter(s => s.payment_status === 'paid');
    console.log(`Hittade ${allSessions.length} totala sessioner i Stripe, varav ${paidSessions.length} är betalda (status: 'paid').\n`);

    // Skapa en karta av unika betalare: UID/Email -> session info
    const paidUsersMap = new Map();

    for (const session of paidSessions) {
        const email = (session.customer_email || session.customer_details?.email || '').toLowerCase().trim();
        const uid = session.metadata?.uid;
        const paidAt = new Date(session.created * 1000);

        const key = uid || email;
        if (!key) continue;

        if (!paidUsersMap.has(key)) {
            paidUsersMap.set(key, {
                uid: uid || null,
                email: email,
                paidAt: paidAt,
                amount: session.amount_total ? session.amount_total / 100 : 299,
                sessionId: session.id
            });
        }
    }

    console.log(`Antal unika betalande användare i Q4 via Stripe: ${paidUsersMap.size}\n`);

    // Hämta även eventuella användare i Firestore som fått premium sedan 1 okt men inte via Checkout
    const firestoreQ4UsersSnap = await db.collection('users')
        .where('isPremium', '==', true)
        .get();

    for (const doc of firestoreQ4UsersSnap.docs) {
        const data = doc.data();
        if (data.premiumType === 'trial') continue; // Hoppa över 7-dagars prov

        const since = data.premiumSince ? (data.premiumSince.toDate ? data.premiumSince.toDate() : new Date(data.premiumSince)) : null;
        if (since && since.getTime() >= new Date('2026-10-01T00:00:00Z').getTime()) {
            const email = (data.email || '').toLowerCase().trim();
            const key = doc.id;
            if (!paidUsersMap.has(key) && !paidUsersMap.has(email)) {
                paidUsersMap.set(key, {
                    uid: doc.id,
                    email: email,
                    paidAt: since,
                    amount: 299,
                    sessionId: data.stripeSessionId || 'firestore'
                });
            }
        }
    }

    // 2. Matcha mot Firestore och uppdatera
    console.log("Steg 2: Matchar mot Firestore 'users'...");
    let updatedCount = 0;
    let already2027Count = 0;
    let notFoundInFirestore = [];

    for (const [key, info] of paidUsersMap.entries()) {
        let userDoc = null;
        let userRef = null;

        if (info.uid) {
            userRef = db.collection('users').doc(info.uid);
            const snap = await userRef.get();
            if (snap.exists) {
                userDoc = snap;
            }
        }

        // Om inte hittad via UID, sök via email
        if (!userDoc && info.email) {
            const querySnap = await db.collection('users').where('email', '==', info.email).limit(1).get();
            if (!querySnap.empty) {
                userDoc = querySnap.docs[0];
                userRef = userDoc.ref;
            }
        }

        if (!userDoc || !userRef) {
            notFoundInFirestore.push(info);
            console.log(`⚠️ Användare finns i Stripe men saknar doc i Firestore: ${info.email} (UID: ${info.uid || 'okänd'})`);
            continue;
        }

        const data = userDoc.data();
        const currentExpires = data.premiumExpiresAt ? (data.premiumExpiresAt.toDate ? data.premiumExpiresAt.toDate() : new Date(data.premiumExpiresAt)) : null;
        const currentExpiresStr = currentExpires ? currentExpires.toISOString().split('T')[0] : 'Ej satt';

        // Kontrollera om de redan är förlängda till slutet av 2027
        // 2026-utgången var satt till 2026-12-31T23:59:59Z (~1 jan 2027 i svensk tid).
        // Slutet av 2027 är 2027-12-31T23:59:59Z.
        const isAlreadyExtended = currentExpires && currentExpires.getTime() > new Date('2027-06-01T00:00:00Z').getTime();

        if (isAlreadyExtended) {
            already2027Count++;
            console.log(`✓ Redan giltig t.o.m 2027: ${info.email} (nuvarande: ${currentExpiresStr})`);
            continue;
        }

        console.log(`➡️  UPPDATERAS: ${info.email} | Betalade: ${info.paidAt.toLocaleDateString('sv-SE')} | Giltighet: ${currentExpiresStr} ➔ 2027-12-31`);

        if (isApply) {
            await userRef.update({
                isPremium: true,
                premiumType: 'yearly_2027',
                premiumExpiresAt: END_OF_2027,
                extendedFor2027: true,
                extendedAt: admin.firestore.FieldValue.serverTimestamp(),
                lastUpdatedBy: 'script_extend_q4_2027'
            });
        }

        updatedCount++;
    }

    console.log("\n==================================================================");
    console.log("SAMMANFATTNING");
    console.log("==================================================================");
    console.log(`Totalt unika Q4-betalare:           ${paidUsersMap.size}`);
    console.log(`Antal som ${isApply ? 'uppdaterades till 2027' : 'skulle uppdateras (dry-run)'}: ${updatedCount}`);
    console.log(`Antal som redan var giltiga 2027:   ${already2027Count}`);
    if (notFoundInFirestore.length > 0) {
        console.log(`Antal som saknade profil i db:      ${notFoundInFirestore.length}`);
    }
    console.log("==================================================================");

    if (isDryRun && updatedCount > 0) {
        console.log("\n💡 För att verkställa ändringen i databasen, kör:");
        console.log("   node scripts/extend_q4_users_to_2027.js --apply\n");
    } else if (isApply) {
        console.log("\n✅ Alla berörda användare har nu förlängts till 2027-12-31!\n");
    }
}

main().catch(err => {
    console.error("Ett fel inträffade:", err);
    process.exit(1);
});
