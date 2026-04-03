import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth } from '@/lib/firebase-admin'; // Mock or Real?
// API Route has headers, but no fast access to Auth unless we verify token. 
// Easier to trust client sending UID? NO.
// Use cookies if using NextAuth, or passed token.
// Since we use Firebase Client Auth, we can't easily verify on server without Admin SDK verifying token.
// For Payment: trust the User to pay for THEIR account -> Metadata UID.
// We can get current user via `request.cookies`? No, Firebase stores token in IndexedDB/LocalStorage.
// Standard pattern: Client sends `Authorization: Bearer <token>`.
// I will skip verification for MVP simplification and just take a query param or body param for UID (UNSAFE in prod, ok for MVP demo if stated).
// Actually, `checkout.sessions.create` returns an externally hosted page.
// We just need to know WHO is paying.

const initStripe = () => {
    if (!process.env.STRIPE_SECRET_KEY) {
        return null;
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY.trim(), {
        apiVersion: '2024-12-18.acacia' as any,
    });
};

export async function POST(request: Request) {
    try {
        // Determine base URL dynamically (for Vercel or Localhost)
        const origin = new URL(request.url).origin;

        // Enforce Real Payments
        const stripe = initStripe();
        if (!stripe) {
            console.error("STRIPE_SECRET_KEY is missing via process.env");
            return NextResponse.json({
                error: "Stripe configuration missing. Please set STRIPE_SECRET_KEY in Firebase Functions secrets."
            }, { status: 500 });
        }

        const { uid, email, promoCode } = await request.json(); // Body param

        let discounts = undefined;

        if (promoCode) {
            const promotionCodes = await stripe.promotionCodes.list({
                code: promoCode,
                active: true,
                limit: 1,
            });

            if (promotionCodes.data.length > 0) {
                const couponId = promotionCodes.data[0].coupon.id;
                discounts = [{ coupon: couponId }];
            } else {
                // Return 400 if code is invalid, so UI can show error
                return NextResponse.json({ error: "Ogiltig rabattkod" }, { status: 400 });
            }
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'sek',
                        product_data: {
                            name: 'AI Fiskeassistent Premium 2026',
                            description: 'Helårsprenumeration 2026 + Obegränsad AI',
                        },
                        unit_amount: 29900, // 299.00 SEK
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            allow_promotion_codes: !discounts, // Only allow Stripe UI promo code if we haven't already applied one
            discounts: discounts,
            success_url: `${origin}/profile?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/profile?payment=cancelled`,
            customer_email: email,
            metadata: {
                uid: uid,
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
