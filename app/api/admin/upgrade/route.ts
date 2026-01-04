import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const { uid } = await request.json();

        // Safety check: Only allow if no STRIPE_KEY (Mock Mode) or explicit dev mode
        // if (process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Disabled in Prod" }, { status: 403 });

        console.log(`Upgrading user ${uid} via Mock API`);

        if (adminDb) {
            await adminDb.collection('users').doc(uid).update({
                isPremium: true,
                premiumType: 'lifetime',
                stripePaymentStatus: 'mock_paid',
                aiQuotaTotal: 500
            });
        } else {
            // Fallback if Admin SDK not working:
            // We can't update from here.
            // But we can return success and Client can try to update? No, rules block client.
            console.warn("Admin DB not connected. Cannot upgrade server-side.");
            return NextResponse.json({ error: "Admin SDK missing" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
