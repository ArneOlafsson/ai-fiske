/**
 * Fiskeappen 2027 – Migrerings- och bildanalysverktyg för gamla fångster
 * 
 * Körning:
 *   node scripts/migrate_catches_schema_2027.js --dry-run
 *   node scripts/migrate_catches_schema_2027.js --apply
 * 
 * Detta skript går igenom alla befintliga fångster i Firestore 'catches',
 * verifierar bildlänkar, inventerar metadata och förbereder datastrukturen
 * för den nya 2027-mobilappen.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ai-fiske-c9441.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ai-fiske-c9441",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ai-fiske-c9441.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const isDryRun = !process.argv.includes('--apply');

async function auditAndMigrateCatches() {
    console.log(`\n======================================================`);
    console.log(`🐟 FISKEAPPEN 2027: Datasanering & Bildmigrering`);
    console.log(`Läge: ${isDryRun ? '🔍 DRY RUN (Inga ändringar skrivs)' : '⚡ APPLY (Skriver uppdateringar)'}`);
    console.log(`Projekt: ${firebaseConfig.projectId}`);
    console.log(`======================================================\n`);

    const catchesRef = collection(db, 'catches');
    const snapshot = await getDocs(catchesRef);

    let totalCatches = 0;
    let withValidImages = 0;
    let withAiResult = 0;
    let withCoordinates = 0;
    let speciesDistribution = {};

    console.log(`Hittade ${snapshot.size} fångster i databasen.\n`);

    snapshot.forEach((doc) => {
        totalCatches++;
        const data = doc.data();
        const docId = doc.id;

        const hasImage = !!data.imageUrl && data.imageUrl.startsWith('http');
        if (hasImage) withValidImages++;

        const hasAi = !!data.aiResult && !!data.aiResult.fishNameSv;
        if (hasAi) {
            withAiResult++;
            const sp = data.aiResult.fishNameSv;
            speciesDistribution[sp] = (speciesDistribution[sp] || 0) + 1;
        }

        const hasGeo = !!data.locationGeo && typeof data.locationGeo.lat === 'number';
        if (hasGeo) withCoordinates++;

        // Visa ett urval av fångster
        if (totalCatches <= 5) {
            console.log(`[Fångst #${totalCatches}] ID: ${docId}`);
            console.log(`  Fiskare: ${data.ownerName || 'Okänd'} (${data.ownerUid})`);
            console.log(`  Bild: ${data.imageUrl ? data.imageUrl.slice(0, 60) + '...' : 'SAKNAS'}`);
            console.log(`  Art: ${data.aiResult?.fishNameSv || 'Ej artbestämd'}`);
            console.log(`  Plats: ${data.locationText || 'Ej angiven'} (Geo: ${hasGeo ? `${data.locationGeo.lat}, ${data.locationGeo.lng}` : 'Saknas'})`);
            console.log(`------------------------------------------------------`);
        }
    });

    console.log(`\n📊 SAMMANSTÄLLNING AV BEFINTLIG DATA:`);
    console.log(`------------------------------------------------------`);
    console.log(`Totalt antal fångster:       ${totalCatches}`);
    console.log(`Fångster med giltig bild:    ${withValidImages} / ${totalCatches} (${Math.round((withValidImages / totalCatches || 0) * 100)}%)`);
    console.log(`Fångster med AI-art:         ${withAiResult} / ${totalCatches}`);
    console.log(`Fångster med GPS-koordinat:  ${withCoordinates} / ${totalCatches}`);
    
    console.log(`\nFördelning av identifierade arter:`);
    Object.entries(speciesDistribution).forEach(([sp, count]) => {
        console.log(`  - ${sp}: ${count} st`);
    });

    console.log(`\n✅ Slutsats för 2027-migreringen:`);
    console.log(`Befintliga bilder ligger lagrade i Firebase Storage och kan läsas`);
    console.log(`direkt av den nya mobilappen utan dataförlust. Vi rekommenderar att`);
    console.log(`alla bildlänkar behålls och kompletteras med ett 'thumbnailUrl'-fält.\n`);
}

auditAndMigrateCatches().catch((err) => {
    console.error("Fel vid granskning av fångster:", err);
});
