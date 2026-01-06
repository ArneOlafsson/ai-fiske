'use client';

import { useAuth } from '@/components/AuthProvider';
import { Button, Card } from '@/components/ui/primitives';
import { Crown, Settings, LogOut, Check, Trash2, Globe, Lock, Timer, Ticket } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Catch } from '@/lib/types';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ProfileContent() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [myCatches, setMyCatches] = useState<Catch[]>([]);
    const [loadingCatches, setLoadingCatches] = useState(true);
    const [promoCode, setPromoCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);

    useEffect(() => {
        if (user && searchParams.get('payment') === 'success_mock') {
            // Client-side Mock Upgrade for MVP/Demo
            updateDoc(doc(db, 'users', user.uid), {
                isPremium: true,
                premiumType: 'lifetime',
                stripePaymentStatus: 'mock_paid',
                aiQuotaTotal: 500
            }).then(() => {
                // Remove param
                router.replace('/profile');
                alert("Mock Betalning Lyckades! Du är nu Premium (Lifetime).");
                window.location.reload();
            }).catch(err => {
                console.error("Mock upgrade failed", err);
                alert("Kunde inte uppgradera: " + err.message);
            });
        }
    }, [user, searchParams, router]);

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'catches'),
            where('ownerUid', '==', user.uid)
            // Removed orderBy to avoid Index issues: orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const firestoreCatches = snapshot.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })) as Catch[];

            // Merge with Local Storage
            const local = JSON.parse(localStorage.getItem('local_catches') || '[]');
            // Filter out local items that might have been synced/duplicates (naive check by ID if possible, or just concat)
            // For MVP simplicty: Just Display All unique by ID
            const allCatches = [...firestoreCatches, ...local].filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);

            // Sort Client-side
            allCatches.sort((a, b) => {
                const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime());
                const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime());
                return (tB || 0) - (tA || 0);
            });

            setMyCatches(allCatches);
            setLoadingCatches(false);
        });
        return () => unsub();
    }, [user]);

    const handleLogout = async () => {
        await signOut(auth);
        localStorage.removeItem('dev_mode_user');
        router.push('/');
    };

    const handleBuyPremium = async () => {
        try {
            if (!user) return;
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.uid, email: user.email })
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error("Checkout failed", err);
        }
    };

    const handleRedeemPromo = async () => {
        if (!promoCode) return;
        setRedeeming(true);
        try {
            // Client-side validation for MVP (since server might lack Service Account)
            const code = promoCode.trim().toUpperCase();
            if (code === 'FISKE2026') {
                if (!user) return;

                const now = new Date();
                const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

                await updateDoc(doc(db, 'users', user.uid), {
                    isPremium: true,
                    premiumType: 'trial',
                    premiumSince: new Date(),
                    premiumExpiresAt: expiresAt,
                    aiQuotaTotal: 50
                });

                alert("Kod aktiverad! Du har nu 7 dagar Premium.");
                window.location.reload();
            } else {
                // Optional: Fallback to server if needed, or just reject
                // For now, simple client check is enough
                alert("Ogiltig kod");
            }
        } catch (err: any) {
            console.error("Promo redeem failed", err);
            alert("Något gick fel: " + err.message);
        } finally {
            setRedeeming(false);
        }
    };

    const togglePublic = async (catchId: string, currentStatus: boolean) => {
        await updateDoc(doc(db, 'catches', catchId), { isPublic: !currentStatus });
    };

    const deleteCatch = async (catchId: string) => {
        if (confirm("Vill du verkligen ta bort denna fångst?")) {
            await deleteDoc(doc(db, 'catches', catchId));
        }
    };

    if (!user || !profile) return null;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Min Profil</h1>
                    <p className="text-muted-foreground">{profile.displayName || user.email}</p>
                    <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
                        <span className="bg-secondary px-2 py-0.5 rounded">{profile.role === 'admin' ? 'Admin' : 'Medlem'}</span>
                        {profile.isPremium && <span className="bg-primary/20 text-primary px-2 py-0.5 rounded font-bold">Premium Lifetime</span>}
                    </div>
                </div>
                <Button variant="outline" onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
                    <LogOut className="w-4 h-4 mr-2" /> Logga ut
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subscription Card */}
                <Card className={`p-6 ${profile.isPremium ? 'border-primary/50 bg-primary/5' : 'border-amber-500/50 bg-amber-500/5'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Crown className={profile.isPremium ? 'text-primary' : 'text-amber-500'} />
                            Prenumeration
                        </h2>
                        {profile.isPremium ? <Check className="text-primary w-6 h-6" /> : null}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                            <p className="text-xl font-bold">
                                {profile.isPremium
                                    ? (profile.premiumType === 'lifetime' ? 'Lifetime Premium' : 'Premium (Provperiod)')
                                    : 'Gratiskonto (Begränsat)'}
                            </p>
                            {profile.premiumExpiresAt && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <Timer className="w-3 h-3" />
                                    Går ut: {profile.premiumExpiresAt.toDate().toLocaleDateString()}
                                </p>
                            )}
                        </div>

                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">AI-Kvot</p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-primary h-full"
                                        style={{ width: `${Math.min(100, (profile.aiQuotaUsed / profile.aiQuotaTotal) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-sm font-bold">{profile.aiQuotaTotal - profile.aiQuotaUsed} kvar</span>
                            </div>
                        </div>

                        {!profile.isPremium && (
                            <div className="space-y-4">
                                <Button onClick={handleBuyPremium} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-12">
                                    Köp Lifetime Deal (299 kr)
                                </Button>

                                <div className="pt-4 border-t border-border">
                                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                        <Ticket className="w-4 h-4" /> Har du en kod?
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Ange kod..."
                                            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={promoCode}
                                            onChange={(e) => setPromoCode(e.target.value)}
                                        />
                                        <Button
                                            onClick={handleRedeemPromo}
                                            disabled={!promoCode || redeeming}
                                            variant="secondary"
                                        >
                                            {redeeming ? '...' : 'Aktivera'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Stats Card */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">Statistik</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-secondary/50 rounded-lg">
                            <div className="text-3xl font-bold text-primary">{myCatches.length}</div>
                            <div className="text-sm text-muted-foreground">Fångster</div>
                        </div>
                        <div className="text-center p-4 bg-secondary/50 rounded-lg">
                            <div className="text-3xl font-bold text-accent">{myCatches.filter(c => c.isPublic).length}</div>
                            <div className="text-sm text-muted-foreground">Publika</div>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-2xl font-bold">Mina Fångster</h2>
                {loadingCatches && <p>Laddar...</p>}
                {!loadingCatches && myCatches.length === 0 && (
                    <p className="text-muted-foreground">Inga fångster än. Gå ut och fiska!</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myCatches.map(item => (
                        <Card key={item.id} className="overflow-hidden group">
                            <div className="aspect-video relative bg-black/50">
                                <img src={item.imageUrl} className="w-full h-full object-cover" alt="Catch" />
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <Button
                                        size="sm" variant="secondary" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => togglePublic(item.id, item.isPublic)}
                                    >
                                        {item.isPublic ? <Globe className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-amber-500" />}
                                    </Button>
                                    <Button
                                        size="sm" variant="secondary" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/20"
                                        onClick={() => deleteCatch(item.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                {item.isPublic && (
                                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                        Publik
                                    </div>
                                )}
                            </div>
                            <div className="p-3">
                                <h3 className="font-bold">{item.aiResult?.fishNameSv || 'Okänd'}</h3>
                                <p className="text-xs text-muted-foreground">{item.locationText}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div>Laddar profil...</div>}>
            <ProfileContent />
        </Suspense>
    );
}
