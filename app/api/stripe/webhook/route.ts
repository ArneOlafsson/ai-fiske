import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
        console.error("Webhook Error: Signature or Secret missing", { signature: !!signature, secret: !!webhookSecret });
        return NextResponse.json({ error: 'Config missing' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
            apiVersion: '2024-12-18.acacia' as any,
        });
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.metadata?.uid;
        const sessionId = session.id;

        if (uid && adminDb) {
            console.log(`Fulfilling purchase for user ${uid} via Webhook`);
            const endOf2026 = new Date('2026-12-31T23:59:59');

            try {
                await adminDb.collection('users').doc(uid).update({
                    isPremium: true,
                    premiumType: 'lifetime',
                    premiumSince: FieldValue.serverTimestamp(),
                    premiumExpiresAt: endOf2026,
                    stripePaymentStatus: 'paid',
                    stripeSessionId: sessionId,
                    aiQuotaTotal: 1000,
                    lastUpdatedBy: 'webhook'
                });
                console.log(`User ${uid} upgraded successfully via Webhook`);
            } catch (firestoreError) {
                console.error(`Firestore update failed for user ${uid}:`, firestoreError);
                return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
            }
        } else {
            console.error("Webhook Fulfillment Error: UID missing or adminDb not initialized", {
                uidPresent: !!uid,
                adminDbPresent: !!adminDb
            });
        }
    }

    return NextResponse.json({ received: true });
}
