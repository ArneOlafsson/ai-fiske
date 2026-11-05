import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const initStripe = () => {
    if (!process.env.STRIPE_SECRET_KEY) return null;
    return new Stripe(process.env.STRIPE_SECRET_KEY.trim(), {
        apiVersion: '2024-12-18.acacia' as any,
    });
};

export async function POST(request: Request) {
    try {
        const origin = new URL(request.url).origin;
        const { uid } = await request.json();

        if (!uid) {
            return NextResponse.json({ error: 'Missing UID' }, { status: 400 });
        }

        const stripe = initStripe();
        if (!stripe) {
            return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
        }

        if (!adminDb) {
            return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
        }

        const userDoc = await adminDb.collection('users').doc(uid).get();
        const userData = userDoc.data();
        const customerId = userData?.stripeCustomerId;

        if (!customerId) {
            return NextResponse.json({ error: 'Inget aktivt Stripe-kundkonto hittades för användaren' }, { status: 404 });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/profile`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (err: any) {
        console.error("Portal Session Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
