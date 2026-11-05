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
            const userRef = adminDb.collection('users').doc(uid);
            const userSnap = await userRef.get();
            const userData = userSnap.data();

            const currentExpires = userData?.premiumExpiresAt 
                ? (userData.premiumExpiresAt.toDate ? userData.premiumExpiresAt.toDate() : new Date(userData.premiumExpiresAt)) 
                : null;

            // Om användaren har kvarvarande aktiv period, förläng med 12 månader från utgångsdatumet
            // Annars 12 månader från idag.
            const baseDate = (currentExpires && currentExpires.getTime() > Date.now()) ? currentExpires : new Date();
            const newExpires = new Date(baseDate);
            newExpires.setFullYear(newExpires.getFullYear() + 1);

            const subscriptionId = session?.subscription 
                ? (typeof session.subscription === 'string' ? session.subscription : (session.subscription as any)?.id) 
                : null;
            const customerId = session?.customer 
                ? (typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id) 
                : null;

            await userRef.update({
                isPremium: true,
                premiumType: 'subscription',
                subscriptionStatus: 'active',
                stripeCustomerId: customerId || userData?.stripeCustomerId || null,
                stripeSubscriptionId: subscriptionId || userData?.stripeSubscriptionId || null,
                premiumSince: userData?.premiumSince || FieldValue.serverTimestamp(),
                premiumExpiresAt: newExpires,
                stripePaymentStatus: 'paid',
                stripeSessionId: session_id,
                aiQuotaTotal: 1000,
                lastUpdatedBy: 'verify_subscription'
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
