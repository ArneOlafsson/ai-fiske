'use client';

import { useAuth } from '@/components/AuthProvider';
import { Button, Card } from '@/components/ui/primitives';
import { Crown, Settings, LogOut, Check, Trash2, Globe, Lock } from 'lucide-react';
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

    useEffect(() => {
        if (user && searchParams.get('payment') === 'success_mock') {
            // Call Mock Upgrade
            fetch('/api/admin/upgrade', {
                method: 'POST',
                body: JSON.stringify({ uid: user.uid })
            }).then(() => {
                // Remove param
                router.replace('/profile');
                alert("Mock Betalning Lyckades! Du är nu Premium.");
            });
        }
    }, [user, searchParams, router]);

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'catches'),
            where('ownerUid', '==', user.uid),
            orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, (snapshot) => {
            setMyCatches(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Catch[]);
            setLoadingCatches(false);
        });
        return () => unsub();
    }, [user]);

    const handleLogout = async () => {
        await signOut(auth);
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
                            <p className="text-xl font-bold">{profile.isPremium ? 'Aktiv (Livstid)' : 'Gratiskonto (Begränsat)'}</p>
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
                            <Button onClick={handleBuyPremium} className="w-full bg-amber-500 hover:bg-amber-600 text-white mt-2">
                                Uppgradera för 99 kr
                            </Button>
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
