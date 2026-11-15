import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiResult } from '@/lib/types';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const ACTIVE_GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(ACTIVE_GEMINI_KEY);

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Version',
};

const VIP_LIFETIME_EMAILS = new Set([
    'johan@animaldeli.com',
    'johan@bertlid.se',
    'arvid.bertlid@icloud.com',
    'arne@olafsson.se',
    'arne.olafsson@gmail.com',
]);

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function getCurrentYearMonth(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { imageUrl, mode } = body;

        if (!imageUrl) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400, headers: CORS_HEADERS });
        }

        // Optional server-side quota check when authenticated (Mobile 1.2.0+)
        let remainingScans: number | null = null;
        const authHeader = request.headers.get('authorization') || '';
        const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

        if (idToken && adminAuth && adminDb) {
            try {
                const decoded = await adminAuth.verifyIdToken(idToken);
                const uid = decoded.uid;
                const emailLower = (decoded.email || '').toLowerCase().trim();

                const [configSnap, userSnap] = await Promise.all([
                    adminDb.collection('config').doc('app').get(),
                    adminDb.collection('users').doc(uid).get(),
                ]);

                const paywallDateStr = configSnap.exists
                    ? configSnap.data()?.paywallStartDate || '2026-12-01'
                    : '2026-12-01';
                const paywallActive = Date.now() >= new Date(`${paywallDateStr}T00:00:00+01:00`).getTime();

                const userData = userSnap.exists ? userSnap.data() : null;
                const isAdminOrVip =
                    VIP_LIFETIME_EMAILS.has(emailLower) ||
                    userData?.role === 'admin' ||
                    userData?.premiumType === 'lifetime' ||
                    userData?.grantedBy === 'arne@olafsson.se';

                let hasActivePaidPro = isAdminOrVip;
                if (!hasActivePaidPro && userData?.isPremium) {
                    const nowMs = Date.now();
                    const q4Start2026Ms = new Date('2026-10-01T00:00:00Z').getTime();
                    const endOf2026Ms = new Date('2026-12-31T23:59:59Z').getTime();
                    const explicitExpMs = userData.premiumExpiresAt?.toDate
                        ? userData.premiumExpiresAt.toDate().getTime()
                        : userData.premiumExpiresAt
                        ? new Date(userData.premiumExpiresAt).getTime()
                        : null;
                    const paidSinceMs = userData.premiumSince?.toDate
                        ? userData.premiumSince.toDate().getTime()
                        : userData.createdAt?.toDate
                        ? userData.createdAt.toDate().getTime()
                        : 0;

                    let effectiveExpMs: number;
                    if (explicitExpMs) {
                        effectiveExpMs = explicitExpMs;
                    } else if (paidSinceMs >= q4Start2026Ms) {
                        const d = new Date(paidSinceMs);
                        d.setFullYear(d.getFullYear() + 1);
                        effectiveExpMs = d.getTime();
                    } else {
                        effectiveExpMs = endOf2026Ms;
                    }

                    hasActivePaidPro = nowMs <= effectiveExpMs;
                }

                if (paywallActive && !hasActivePaidPro) {
                    const currentMonth = getCurrentYearMonth();
                    const usedThisMonth =
                        userData?.aiScansMonth === currentMonth && typeof userData?.aiScansUsed === 'number'
                            ? userData.aiScansUsed
                            : 0;

                    if (usedThisMonth >= 3) {
                        return NextResponse.json(
                            {
                                error: 'QUOTA_EXCEEDED',
                                message: 'Du har använt dina 3 fria AI-artbestämningar denna månad.',
                                remainingScans: 0,
                            },
                            { status: 403, headers: CORS_HEADERS }
                        );
                    }

                    const newUsed = usedThisMonth + 1;
                    remainingScans = Math.max(0, 3 - newUsed);
                    await adminDb
                        .collection('users')
                        .doc(uid)
                        .set(
                            {
                                aiScansMonth: currentMonth,
                                aiScansUsed: newUsed,
                            },
                            { merge: true }
                        );
                }
            } catch (tokenErr) {
                console.warn('Identify auth check warning:', tokenErr);
            }
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-3.5-flash-lite',
            generationConfig: {
                responseMimeType: 'application/json',
            },
        });

        let imagePart;
        if (imageUrl.startsWith('data:image')) {
            const base64Data = imageUrl.split(',')[1];
            const mimeType = imageUrl.split(':')[1].split(';')[0];
            imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType,
                },
            };
        } else {
            const imageResp = await fetch(imageUrl);
            const arrayBuffer = await imageResp.arrayBuffer();
            const base64Data = Buffer.from(arrayBuffer).toString('base64');
            const mimeType = imageResp.headers.get('content-type') || 'image/jpeg';
            imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType,
                },
            };
        }

        if (mode === 'fast') {
            const fastPrompt =
                'Identifiera fiskarten på bilden på svenska (t.ex. Öring, Havsöring, Gädda, Abborre, Gös, Lax, Röding, Regnbåge, Harr). Om ingen fisk syns, returnera "Okänd". Returnera ENDAST giltig JSON: {"fishNameSv": "Artnamn", "confidence": 0.96}';
            const result = await model.generateContent([fastPrompt, imagePart]);
            const responseText = result.response.text();
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            return NextResponse.json(
                {
                    aiResult: {
                        fishNameSv: parsed?.fishNameSv || 'Okänd',
                        confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : 0.95,
                    },
                    ...(remainingScans !== null ? { remainingScans } : {}),
                },
                { headers: CORS_HEADERS }
            );
        }

        const prompt = `
        Analysera denna fiskbild för en svensk fiskeapp.
        Returnera enbart valid JSON (ingen markdown) med följande struktur:
        {
            "fishNameSv": "Svenskt artnamn",
            "fishNameLatin": "Latinskt namn",
            "confidence": 0.0-1.0 (siffra),
            "descriptionShort": "Kort beskrivning (max 2 meningar)",
            "edible": "Ja" | "Nej" | "Beror på",
            "edibleNotes": "Kort notering om matvärde",
            "recipeTitle": "Titel på ett passande recept",
            "recipeIngredients": ["ingrediens 1", "ingrediens 2"...],
            "recipeSteps": ["steg 1", "steg 2"...],
            "cookingMethod": "Stekning" | "Ugn" | "Grillning" | "Soppa"
        }
        Om det inte är en fisk, sätt "fishNameSv": "Okänd" och confidence lågt.
        VIKTIGT: För fiskar som generellt är kända som fina matfiskar (t.ex. Röding, Abborre, Gös, Lax, Öring), svara ALLTID "Ja" på 'edible'. Använd endast "Beror på" om det är en art där matkvaliteten rymmer stor variation eller vanligtvis returneras (t.ex. äldre Gädda, Braxen).
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiResult: AiResult = JSON.parse(cleanJson);

        return NextResponse.json(
            {
                aiResult,
                ...(remainingScans !== null ? { remainingScans } : {}),
            },
            { headers: CORS_HEADERS }
        );
    } catch (error: any) {
        console.error('AI Error Detailed:', error);
        return NextResponse.json(
            { error: 'Internal Server Error: ' + error.message },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}
