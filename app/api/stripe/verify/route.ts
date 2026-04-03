import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const initStripe = () => {
    if (!process.env.STRIPE_SECRET_KEY) return null;
    return new Stripe(process.env.STRIPE_SECRET_KEY.trim(), {
        apiVersion: '2024-12-18.acacia' as any,
    });
};

export async function POST(request: Request) {
    try {
        const { session_id, uid } = await request.json();

        if (!session_id || !uid) {
            return NextResponse.json({ error: 'Missing session_id or uid' }, { status: 400 });
        }

        // Verify with Stripe
        let session;
        const stripe = initStripe();

        if (stripe) {
            session = await stripe.checkout.sessions.retrieve(session_id);

            if (session.payment_status !== 'paid') {
                return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
            }
        } else {
            console.warn("Skipping Stripe verification (Missing Key)");
            // In strict mode, we might want to fail here:
            // return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        if (adminDb) {
            // Update User in Firestore via Admin SDK (Bypasses security rules)
            // premiumExpiresAt: End of 2026 (approx)
            const endOf2026 = new Date('2026-12-31T23:59:59');

            await adminDb.collection('users').doc(uid).update({
                isPremium: true,
                premiumType: 'lifetime', // Keeping lifetime enum for simplicity or change to 'year_2026'
                premiumSince: FieldValue.serverTimestamp(),
                premiumExpiresAt: endOf2026,
                stripePaymentStatus: 'paid',
                stripeSessionId: session_id,
                aiQuotaTotal: 1000, // Year 2026 Limit
            });

            return NextResponse.json({ success: true });
        } else {
            const { adminInitError } = await import('@/lib/firebase-admin');
            return NextResponse.json({
                error: 'Admin DB not initialized',
                details: adminInitError
            }, { status: 500 });
        }

    } catch (err: any) {
        console.error("Verification error", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
