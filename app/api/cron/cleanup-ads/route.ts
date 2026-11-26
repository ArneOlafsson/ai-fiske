import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET() {
    try {
        if (!adminDb) {
            return NextResponse.json({ ok: false, error: 'adminDb unavailable' }, { status: 500 });
        }

        const nowTs = Timestamp.now();
        let removedCatches = 0;
        let removedVip = 0;
        let deactivatedAds = 0;

        const [expCatches, expVip, expAds] = await Promise.all([
            adminDb.collection('catches').where('expiresAt', '<=', nowTs).get(),
            adminDb.collection('vip_events').where('expiresAt', '<=', nowTs).get(),
            adminDb.collection('ads').where('expiresAt', '<=', nowTs).get(),
        ]);

        for (const d of expCatches.docs) {
            await d.ref.delete();
            removedCatches++;
        }
        for (const d of expVip.docs) {
            await d.ref.delete();
            removedVip++;
        }
        for (const d of expAds.docs) {
            if (d.data().active !== false) {
                await d.ref.update({ active: false });
                deactivatedAds++;
            }
        }

        return NextResponse.json({
            ok: true,
            removedCatches,
            removedVip,
            deactivatedAds,
            checkedAt: new Date().toISOString(),
        });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 });
    }
}
