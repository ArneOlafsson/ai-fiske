import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET || '';

export async function POST(request: Request) {
    try {
        if (WEBHOOK_SECRET) {
            const authHeader = request.headers.get('authorization') || '';
            const cleanToken = authHeader.replace(/^Bearer\s+/i, '').trim();
            if (cleanToken !== WEBHOOK_SECRET) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const payload = await request.json();
        const event = payload?.event;
        if (!event || !adminDb) {
            return NextResponse.json({ received: true });
        }

        const type: string = event.type || '';
        const productId: string = event.product_id || '';
        const store: string = event.store || '';
        const expirationAtMs: number | null = typeof event.expiration_at_ms === 'number' ? event.expiration_at_ms : null;
        const purchasedAtMs: number | null = typeof event.purchased_at_ms === 'number' ? event.purchased_at_ms : null;

        // Collect candidate Firebase UIDs (skip anonymous $RCAnonymousID:...)
        const candidateIds = new Set<string>();
        if (typeof event.app_user_id === 'string' && !event.app_user_id.startsWith('$RCAnonymousID:')) {
            candidateIds.add(event.app_user_id);
        }
        if (typeof event.original_app_user_id === 'string' && !event.original_app_user_id.startsWith('$RCAnonymousID:')) {
            candidateIds.add(event.original_app_user_id);
        }
        if (Array.isArray(event.aliases)) {
            for (const alias of event.aliases) {
                if (typeof alias === 'string' && !alias.startsWith('$RCAnonymousID:')) {
                    candidateIds.add(alias);
                }
            }
        }
        if (Array.isArray(event.transferred_to)) {
            for (const target of event.transferred_to) {
                if (typeof target === 'string' && !target.startsWith('$RCAnonymousID:')) {
                    candidateIds.add(target);
                }
            }
        }

        if (candidateIds.size === 0) {
            return NextResponse.json({ received: true, note: 'anonymous_user' });
        }

        const plan: 'monthly' | 'yearly' = productId.toLowerCase().includes('month') ? 'monthly' : 'yearly';
        const premiumSource = store === 'APP_STORE' ? 'apple' : store === 'PLAY_STORE' ? 'google' : 'iap';
        const nowMs = Date.now();

        for (const uid of candidateIds) {
            const userRef = adminDb.collection('users').doc(uid);
            const snap = await userRef.get();
            const existing = snap.exists ? snap.data() : null;

            const isProtectedLifetime =
                existing?.role === 'admin' ||
                existing?.premiumType === 'lifetime' ||
                existing?.grantedBy === 'arne@olafsson.se';

            if (
                type === 'INITIAL_PURCHASE' ||
                type === 'RENEWAL' ||
                type === 'UNCANCELLATION' ||
                type === 'PRODUCT_CHANGE' ||
                type === 'NON_RENEWING_PURCHASE' ||
                type === 'TRANSFER'
            ) {
                const defaultExpMs =
                    plan === 'monthly'
                        ? nowMs + 31 * 24 * 60 * 60 * 1000
                        : nowMs + 366 * 24 * 60 * 60 * 1000;
                const effectiveExpMs = expirationAtMs && expirationAtMs > nowMs ? expirationAtMs : defaultExpMs;

                await userRef.set(
                    {
                        isPremium: true,
                        premiumType: isProtectedLifetime ? existing?.premiumType || 'lifetime' : 'subscription',
                        plan,
                        subscriptionStatus: 'active',
                        premiumSource,
                        revenueCatProductId: productId,
                        premiumSince:
                            existing?.premiumSince ||
                            (purchasedAtMs ? Timestamp.fromMillis(purchasedAtMs) : FieldValue.serverTimestamp()),
                        premiumExpiresAt: Timestamp.fromMillis(effectiveExpMs),
                        aiQuotaTotal: 9999,
                        lastUpdatedBy: `rc_webhook_${type.toLowerCase()}`,
                        updatedAt: FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                );
            } else if (type === 'CANCELLATION') {
                // Cancellation means auto-renew turned off; user keeps access until expirationAtMs unless refunded immediately
                const stillActive = expirationAtMs ? expirationAtMs > nowMs : false;
                if (!isProtectedLifetime) {
                    await userRef.set(
                        {
                            isPremium: stillActive ? true : false,
                            subscriptionStatus: stillActive ? 'canceled' : 'expired',
                            ...(expirationAtMs ? { premiumExpiresAt: Timestamp.fromMillis(expirationAtMs) } : {}),
                            subscriptionCanceledAt: FieldValue.serverTimestamp(),
                            lastUpdatedBy: 'rc_webhook_cancellation',
                        },
                        { merge: true }
                    );
                }
            } else if (type === 'EXPIRATION') {
                if (!isProtectedLifetime) {
                    // Check if user has another active subscription (e.g. Stripe) with a future expiry
                    const currentExpMs = existing?.premiumExpiresAt?.toDate
                        ? existing.premiumExpiresAt.toDate().getTime()
                        : 0;
                    const hasActiveStripe =
                        existing?.stripeSubscriptionId &&
                        existing?.subscriptionStatus === 'active' &&
                        currentExpMs > nowMs + 24 * 60 * 60 * 1000;

                    if (!hasActiveStripe) {
                        await userRef.set(
                            {
                                isPremium: false,
                                subscriptionStatus: 'expired',
                                ...(expirationAtMs ? { premiumExpiresAt: Timestamp.fromMillis(expirationAtMs) } : {}),
                                lastUpdatedBy: 'rc_webhook_expiration',
                            },
                            { merge: true }
                        );
                    }
                }
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('RevenueCat webhook error:', error);
        return NextResponse.json({ error: error?.message || 'Webhook error' }, { status: 500 });
    }
}
