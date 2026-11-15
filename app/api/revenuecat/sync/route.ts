import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const RC_IOS_PUBLIC_KEY = process.env.REVENUECAT_IOS_PUBLIC_KEY || 'appl_uLPpINnDHHOnNGnfuaqlvOYDMSV';
const RC_ANDROID_PUBLIC_KEY = process.env.REVENUECAT_ANDROID_PUBLIC_KEY || 'goog_UixzwFWZshhwlZcHtRrlkEKmDCD';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Version',
};

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('authorization') || '';
        const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

        if (!idToken || !adminAuth || !adminDb) {
            return NextResponse.json(
                { error: 'Unauthorized or server admin unavailable' },
                { status: 401, headers: CORS_HEADERS }
            );
        }

        const decoded = await adminAuth.verifyIdToken(idToken);
        const uid = decoded.uid;

        const body = await request.json().catch(() => ({}));
        const platform = body?.platform === 'ios' ? 'ios' : 'android';
        const rcApiKey = platform === 'ios' ? RC_IOS_PUBLIC_KEY : RC_ANDROID_PUBLIC_KEY;

        // Verify subscriber status directly against RevenueCat REST API v1
        const rcRes = await fetch(
            `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${rcApiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!rcRes.ok) {
            return NextResponse.json(
                { error: 'Could not verify RevenueCat subscriber', status: rcRes.status },
                { status: 502, headers: CORS_HEADERS }
            );
        }

        const rcData = await rcRes.json();
        const proEntitlement = rcData?.subscriber?.entitlements?.pro;

        if (!proEntitlement) {
            return NextResponse.json(
                { isPremium: false, reason: 'no_pro_entitlement' },
                { headers: CORS_HEADERS }
            );
        }

        const expiresDateStr: string | null = proEntitlement.expires_date || null;
        const purchaseDateStr: string | null = proEntitlement.purchase_date || null;
        const productIdentifier: string = proEntitlement.product_identifier || '';

        const nowMs = Date.now();
        const expiresMs = expiresDateStr ? new Date(expiresDateStr).getTime() : nowMs + 366 * 24 * 60 * 60 * 1000;
        const isActive = expiresMs > nowMs;

        const plan: 'monthly' | 'yearly' = productIdentifier.toLowerCase().includes('month') ? 'monthly' : 'yearly';
        const premiumSource = platform === 'ios' ? 'apple' : 'google';

        const userRef = adminDb.collection('users').doc(uid);
        const existingSnap = await userRef.get();
        const existingData = existingSnap.exists ? existingSnap.data() : null;

        if (isActive) {
            await userRef.set(
                {
                    email: decoded.email || existingData?.email || null,
                    isPremium: true,
                    premiumType: existingData?.premiumType === 'lifetime' ? 'lifetime' : 'subscription',
                    plan,
                    subscriptionStatus: 'active',
                    premiumSource,
                    revenueCatProductId: productIdentifier,
                    premiumSince:
                        existingData?.premiumSince ||
                        (purchaseDateStr ? Timestamp.fromDate(new Date(purchaseDateStr)) : FieldValue.serverTimestamp()),
                    premiumExpiresAt: Timestamp.fromMillis(expiresMs),
                    aiQuotaTotal: 9999,
                    lastUpdatedBy: 'rc_client_sync',
                    updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true }
            );
        }

        return NextResponse.json(
            {
                isPremium: isActive,
                plan,
                expiresAt: new Date(expiresMs).toISOString().split('T')[0],
                productIdentifier,
            },
            { headers: CORS_HEADERS }
        );
    } catch (error: any) {
        console.error('RevenueCat sync error:', error);
        return NextResponse.json(
            { error: error?.message || 'Sync error' },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}
