'use client';

import { useAuth } from '@/components/AuthProvider';
import { Button, Card } from '@/components/ui/primitives';
import { Crown, Settings, LogOut, Check, Trash2, Globe, Lock, Timer, Ticket, User as UserIcon, RefreshCw } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { Catch } from '@/lib/types';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ProfileContent() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [myCatches, setMyCatches] = useState<Catch[]>([]);
    const [loadingCatches, setLoadingCatches] = useState(true);
    const [verifying, setVerifying] = useState(false);

    // Prevent double verification in StrictMode
    const verifyingSession = useRef<string | null>(null);

    useEffect(() => {
        // Handle Verification (Real)
        const sessionId = searchParams?.get('session_id');
        const paymentStatus = searchParams?.get('payment');

        if (user && paymentStatus === 'success' && sessionId) {
            if (verifyingSession.current === sessionId) return;
            verifyingSession.current = sessionId;

            setVerifying(true);
            // Verify with Server
            fetch('/api/stripe/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, uid: user.uid })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert("Betalning verifierad! Välkommen till Premium 2026.");
                        window.location.href = '/profile';
                    } else {
                        alert("Verifiering misslyckades: " + (data.error || 'Okänt fel') + (data.details ? ` (${data.details})` : ''));
                    }
                })
                .catch(err => alert("Kunde inte verifiera: " + err.message))
                .finally(() => {
                    setVerifying(false);
                    // Keep verifyingSession set to block duplicates
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

    const handleForceReload = () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    registration.unregister();
                }
            });
        }
        window.location.reload();
    };

    const handleLogout = async () => {
        await signOut(auth);
        localStorage.removeItem('dev_mode_user');
        router.push('/');
    };

    const [loadingPayment, setLoadingPayment] = useState(false);

    const handleBuyPremium = async () => {
        try {
            if (!user) return;
            setLoadingPayment(true);
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.uid, email: user.email })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Ett fel uppstod vid start av betalning.");
            }

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            console.error("Checkout failed", err);
            alert("Kunde inte starta betalning: " + err.message);
        } finally {
            setLoadingPayment(false);
        }
    };



    const togglePublic = async (catchId: string, currentStatus: boolean) => {
        await updateDoc(doc(db, 'catches', catchId), { isPublic: !currentStatus });
    };

    const deleteCatch = async (catchId: string, imageUrl: string) => {
        if (confirm("Vill du verkligen ta bort denna fångst?")) {
            await deleteDoc(doc(db, 'catches', catchId));
            if (imageUrl && imageUrl.includes('firebasestorage')) {
                const imageRef = ref(storage, imageUrl);
                await deleteObject(imageRef).catch(e => console.warn("Kunde inte radera bild från storage:", e));
            }
        }
    };

    const handleRepairProfile = async () => {
        if (!user) return;
        try {
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0] || 'Fiskare',
                photoURL: user.photoURL,
                createdAt: serverTimestamp(),
                isPremium: false,
                premiumType: 'none',
                aiQuotaTotal: 500,
                aiQuotaUsed: 0,
                role: 'user',
                banned: false
            });
            window.location.reload();
        } catch (err) {
            console.error("Repair failed", err);
            alert("Kunde inte reparera profilen. Kontakta support.");
        }
    };

    if (!user) {
        return (
            <div className="max-w-md mx-auto py-12 text-center space-y-6">
                <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <UserIcon className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">Logga in för att se din profil</h1>
                <p className="text-muted-foreground text-lg">
                    För att spara dina fångster, se din statistik och hantera din prenumeration behöver du ett konto.
                </p>
                <div className="space-y-3 pt-4">
                    <Button className="w-full text-lg h-12" onClick={() => router.push('/login')}>
                        Logga in
                    </Button>
                    <Button variant="outline" className="w-full text-lg h-12" onClick={() => router.push('/register')}>
                        Skapa konto
                    </Button>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="max-w-md mx-auto py-12 text-center space-y-6">
                <div className="bg-amber-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                    <Settings className="w-10 h-10 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold">Ofullständig Profil</h2>
                <p className="text-muted-foreground">
                    Vi hittade ditt konto men det saknas viss information (databas-post).
                    Detta kan hända om registreringen avbröts.
                </p>
                <div className="space-y-3">
                    <Button onClick={handleRepairProfile} className="w-full">
                        Reparera Konto (Skapa data)
                    </Button>
                    <Button variant="outline" onClick={handleLogout} className="w-full">
                        Logga ut
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Min Profil</h1>
                    <p className="text-muted-foreground">{profile.displayName || user.email}</p>
                    <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
                        <span className="bg-secondary px-2 py-0.5 rounded">{profile.role === 'admin' ? 'Admin' : 'Medlem'}</span>
                        {profile.isPremium && <span className="bg-primary/20 text-primary px-2 py-0.5 rounded font-bold">Premium 2026</span>}
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <Button variant="secondary" onClick={handleForceReload} className="w-full sm:w-auto">
                        <RefreshCw className="w-4 h-4 mr-2" /> Hämta Uppdateringar
                    </Button>
                    <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto text-destructive hover:bg-destructive/10">
                        <LogOut className="w-4 h-4 mr-2" /> Logga ut
                    </Button>
                </div>
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
                                    ? (profile.premiumType === 'lifetime' ? 'Premium 2026' : 'Premium (Provperiod)')
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

                        {(!profile.isPremium || profile.premiumType === 'trial') && (
                            <div className="space-y-4">
                                <Button
                                    onClick={handleBuyPremium}
                                    disabled={loadingPayment}
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-12"
                                >
                                    {loadingPayment ? 'Startar betalning...' : (profile.isPremium ? 'Uppgradera till Helår 2026 (299 kr)' : 'Köp Årskort 2026 (299 kr)')}
                                </Button>
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
                            <div className="aspect-square relative bg-black/50">
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
                                        onClick={() => deleteCatch(item.id, item.imageUrl)}
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
