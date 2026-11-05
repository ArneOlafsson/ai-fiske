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
            const userRef = adminDb.collection('users').doc(uid);
            const userSnap = await userRef.get();
            const userData = userSnap.data();

            const currentExpires = userData?.premiumExpiresAt 
                ? (userData.premiumExpiresAt.toDate ? userData.premiumExpiresAt.toDate() : new Date(userData.premiumExpiresAt)) 
                : null;

            // Förläng med 12 månader från nuvarande utgångsdatum om det fortfarande är aktivt, annars från idag
            const baseDate = (currentExpires && currentExpires.getTime() > Date.now()) ? currentExpires : new Date();
            const newExpires = new Date(baseDate);
            newExpires.setFullYear(newExpires.getFullYear() + 1);

            const subscriptionId = session?.subscription 
                ? (typeof session.subscription === 'string' ? session.subscription : (session.subscription as any)?.id) 
                : null;
            const customerId = session?.customer 
                ? (typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id) 
                : null;

            try {
                await userRef.update({
                    isPremium: true,
                    premiumType: 'subscription',
                    subscriptionStatus: 'active',
                    stripeCustomerId: customerId || userData?.stripeCustomerId || null,
                    stripeSubscriptionId: subscriptionId || userData?.stripeSubscriptionId || null,
                    premiumSince: userData?.premiumSince || FieldValue.serverTimestamp(),
                    premiumExpiresAt: newExpires,
                    stripePaymentStatus: 'paid',
                    stripeSessionId: sessionId,
                    aiQuotaTotal: 1000,
                    lastUpdatedBy: 'webhook_checkout'
                });
                console.log(`User ${uid} upgraded to subscription successfully via Webhook`);
            } catch (firestoreError) {
                console.error(`Firestore update failed for user ${uid}:`, firestoreError);
                return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
            }
        }
    }

    // Automatisk årlig förnyelse när nästa faktura dras efter 12 månader
    if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : (invoice.subscription as any)?.id;
        
        if (subId && adminDb && invoice.billing_reason === 'subscription_cycle') {
            console.log(`Processing subscription renewal for ${subId}`);
            const querySnap = await adminDb.collection('users').where('stripeSubscriptionId', '==', subId).limit(1).get();
            if (!querySnap.empty) {
                const docRef = querySnap.docs[0].ref;
                const data = querySnap.docs[0].data();
                const cur = data.premiumExpiresAt?.toDate ? data.premiumExpiresAt.toDate() : new Date();
                const nextYear = new Date(cur.getTime() > Date.now() ? cur : new Date());
                nextYear.setFullYear(nextYear.getFullYear() + 1);

                await docRef.update({
                    isPremium: true,
                    subscriptionStatus: 'active',
                    premiumExpiresAt: nextYear,
                    lastRenewedAt: FieldValue.serverTimestamp(),
                    lastUpdatedBy: 'webhook_renewal'
                });
                console.log(`Renewed user subscription for 12 months: ${querySnap.docs[0].id}`);
            }
        }
    }

    // Uppsägning av abonnemang
    if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.id && adminDb) {
            const querySnap = await adminDb.collection('users').where('stripeSubscriptionId', '==', sub.id).limit(1).get();
            if (!querySnap.empty) {
                await querySnap.docs[0].ref.update({
                    subscriptionStatus: 'canceled',
                    subscriptionCanceledAt: FieldValue.serverTimestamp()
                });
                console.log(`Marked subscription canceled for user ${querySnap.docs[0].id}`);
            }
        }
    }

    return NextResponse.json({ received: true });
}
