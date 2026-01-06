import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const { code, uid } = await request.json();

        if (!code || !uid) {
            return NextResponse.json({ error: "Missing code or uid" }, { status: 400 });
        }

        const cleanCode = code.trim().toUpperCase();

        if (cleanCode !== 'FISKE2026') {
            return NextResponse.json({ error: "Ogiltig kod" }, { status: 400 });
        }

        if (!adminDb) {
            console.error("Admin DB not connected");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await adminDb.collection('users').doc(uid).update({
            isPremium: true,
            premiumType: 'trial',
            premiumSince: Timestamp.now(),
            premiumExpiresAt: Timestamp.fromDate(expiresAt),
            aiQuotaTotal: 50 // Trial quota
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Promo redeem error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
