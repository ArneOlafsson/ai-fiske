'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, increment, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Catch } from '@/lib/types';
import { Card, Button } from '@/components/ui/primitives';
import { Heart, MapPin, Calendar, MessageSquare } from 'lucide-react';
import CommentSection from '@/components/features/CommentSection';
import { useAuth } from '@/components/AuthProvider';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const MOCK_CATCHES: Catch[] = [
    {
        id: 'mock-1',
        ownerUid: 'mock-user-1',
        imageUrl: 'https://images.unsplash.com/photo-1544551763-46a8723ba3f9?auto=format&fit=crop&q=80&w=1000',
        locationText: 'Storsjön, Jämtland',
        waterType: 'sjö',
        comment: 'Vilken bjässe! Tog på en spinnare i solnedgången.',
        isPublic: true,
        likesCount: 12,
        createdAt: { toDate: () => new Date(Date.now() - 86400000) } as any,
        aiResult: {
            fishNameSv: 'Gädda',
            fishNameLatin: 'Esox lucius',
            confidence: 0.98,
            descriptionShort: 'En stor rovfisk vanlig i svenska insjöar.',
            edible: 'Ja',
            edibleNotes: 'Utmärkt matfisk men mycket ben.',
            recipeTitle: 'Ugnsbakad gädda med pepparrot',
            recipeIngredients: [],
            recipeSteps: [],
            cookingMethod: 'Ugn'
        }
    },
    {
        id: 'mock-2',
        ownerUid: 'mock-user-2',
        imageUrl: 'https://images.unsplash.com/photo-1520188746-86d396d5e777?auto=format&fit=crop&q=80&w=1000',
        locationText: 'Stockholms Skärgård',
        waterType: 'hav',
        comment: 'Första abborren för säsongen!',
        isPublic: true,
        likesCount: 45,
        createdAt: { toDate: () => new Date(Date.now() - 172800000) } as any,
        aiResult: {
            fishNameSv: 'Abborre',
            fishNameLatin: 'Perca fluviatilis',
            confidence: 0.99,
            descriptionShort: 'Sveriges vanligaste fisk.',
            edible: 'Ja',
            edibleNotes: 'Mycket god matfisk.',
            recipeTitle: 'Smörstekt abborre',
            recipeIngredients: [],
            recipeSteps: [],
            cookingMethod: 'Stekning'
        }
    },
    {
        id: 'mock-3',
        ownerUid: 'mock-user-3',
        imageUrl: 'https://images.unsplash.com/photo-1498612753354-772a30629934?auto=format&fit=crop&q=80&w=1000',
        locationText: 'Mörrumsån',
        waterType: 'älv',
        comment: 'Laxfiske när det är som bäst.',
        isPublic: true,
        likesCount: 89,
        createdAt: { toDate: () => new Date(Date.now() - 250000000) } as any,
        aiResult: {
            fishNameSv: 'Lax',
            fishNameLatin: 'Salmo salar',
            confidence: 0.96,
            descriptionShort: 'Vandringsfisk som leker i strömmande vatten.',
            edible: 'Ja',
            edibleNotes: 'Delikatess.',
            recipeTitle: 'Gravad Lax',
            recipeIngredients: [],
            recipeSteps: [],
            cookingMethod: 'Gravning'
        }
    }
];

export default function CommunityPage() {
    const [catches, setCatches] = useState<Catch[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Query public catches
        const q = query(
            collection(db, 'catches'),
            where('isPublic', '==', true),
            limit(20)
            // Removed orderBy('createdAt', 'desc') to avoid missing Index
        );

        const getLocalCatches = () => {
            if (typeof window === 'undefined') return [];
            const local = localStorage.getItem('local_catches');
            if (!local) return [];
            try {
                const parsed = JSON.parse(local);
                // Fix timestamp for display
                return parsed.map((c: any) => {
                    let dateVal = c.createdAt;
                    // Handle Firestore Timestamp like object (seconds) or direct number/string
                    if (dateVal?.seconds) dateVal = dateVal.seconds * 1000;

                    const d = new Date(dateVal);
                    // Check valid date
                    if (isNaN(d.getTime())) return null;

                    return {
                        ...c,
                        createdAt: { toDate: () => d }
                    };
                }).filter((c: any) => c !== null);
            } catch (e) { return []; }
        };

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Catch[];

            // Allow merging local catches (for the user's own view) even if DB has items
            const local = getLocalCatches();

            // Combine and Dedup (by ID)
            const allItems = [...items, ...local].filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);

            // Sort Client-side (descending)
            allItems.sort((a, b) => {
                const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0));
                const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0));
                return (tB || 0) - (tA || 0);
            });

            if (allItems.length === 0) {
                setCatches(MOCK_CATCHES);
            } else {
                setCatches(allItems);
            }
            setLoading(false);
        }, (err) => {
            console.warn("Snapshot failed, falling back", err);
            const local = getLocalCatches();
            setCatches([...local, ...MOCK_CATCHES]);
            setLoading(false);
        });

        // Safety Timeout for Dev Mode
        const timeoutId = setTimeout(() => {
            setLoading(prev => {
                if (prev) {
                    console.log("Timeout: Force loading Mock Data");
                    const local = getLocalCatches();
                    setCatches([...local, ...MOCK_CATCHES]);
                    return false;
                }
                return prev;
            });
        }, 1500);

        return () => {
            unsubscribe();
            clearTimeout(timeoutId);
        };
    }, []);

    // Check which catches user has liked
    useEffect(() => {
        if (!user || catches.length === 0) return;

        // In a real app we might query 'likes' collection where uid == user.uid
        // For MVP, simplistic check or just optimistic?
        // Let's assume we don't query *all* likes. We check on the fly or just handle the action.
        // Better: Fetch user's likes for displayed catches? 
        // Doing lazy load or just local state toggle for UI responsiveness.
    }, [user, catches]);

    const handleLike = async (catchId: string, currentLikes: number) => {
        if (!user) return; // Should show login prompt?

        const isLiked = likedMap[catchId];

        // OPTIMISTIC UPDATE
        setLikedMap(prev => ({ ...prev, [catchId]: !isLiked }));
        setCatches(prev => prev.map(c => {
            if (c.id === catchId) {
                return { ...c, likesCount: isLiked ? (c.likesCount - 1) : (c.likesCount + 1) };
            }
            return c;
        }));

        // Handle MOCK items (client-side only)
        if (catchId.startsWith('mock-') || catchId.startsWith('local-')) {
            console.log("Mock Like toggled locally");
            return;
        }

        // REAL FIRESTORE UPDATE
        const likeId = `${catchId}_${user.uid}`;
        const likeRef = doc(db, 'likes', likeId);
        const catchRef = doc(db, 'catches', catchId);

        try {
            if (isLiked) {
                // Unlike
                await deleteDoc(likeRef);
                await updateDoc(catchRef, { likesCount: increment(-1) });
            } else {
                // Like
                await setDoc(likeRef, { catchId, uid: user.uid, createdAt: new Date() });
                await updateDoc(catchRef, { likesCount: increment(1) });
            }
        } catch (err) {
            console.error("Like failed, reverting optimistic update", err);
            // Revert changes on error
            setLikedMap(prev => ({ ...prev, [catchId]: isLiked }));
            setCatches(prev => prev.map(c => {
                if (c.id === catchId) {
                    return { ...c, likesCount: currentLikes };
                }
                return c;
            }));
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold">Community</h1>
                <p className="text-muted-foreground">Se vad andra fiskare har fått upp nyligen.</p>
            </div>

            <div className="space-y-6">
                {loading && <p>Laddar fångster...</p>}
                {!loading && catches.length === 0 && <p>Inga publika fångster än.</p>}

                {catches.map((item) => (
                    <Card key={item.id} className="overflow-hidden bg-card/50 backdrop-blur-sm border-primary/10">
                        <div className="aspect-video relative bg-black/50">
                            {/* Use standard img for demo since image domains not configured for Next.js Image */}
                            <img
                                src={item.imageUrl}
                                alt={item.aiResult?.fishNameSv || "Fångst"}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-bold backdrop-blur-md">
                                {item.aiResult?.fishNameSv || "Okänd"}
                            </div>
                        </div>

                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                                        <MapPin className="w-3 h-3" /> {item.locationText}
                                    </p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'd MMMM yyyy, HH:mm', { locale: sv }) : ''}
                                    </p>
                                </div>
                                {item.aiResult?.confidence && (
                                    <div className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                                        AI: {Math.round(item.aiResult.confidence * 100)}%
                                    </div>
                                )}
                            </div>

                            {item.comment && (
                                <p className="text-foreground/90 italic mb-4">"{item.comment}"</p>
                            )}

                            <div className="flex flex-col gap-4 border-t border-border pt-4 mt-auto">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={likedMap[item.id] ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500"}
                                            onClick={() => handleLike(item.id, item.likesCount)}
                                        >
                                            <Heart className={`w-5 h-5 mr-1 ${likedMap[item.id] ? "fill-current" : ""}`} />
                                            {item.likesCount || 0}
                                        </Button>
                                    </div>

                                    {item.aiResult?.edible && (
                                        <span className={`text-sm font-medium ${item.aiResult.edible === 'Ja' ? 'text-green-500' : 'text-amber-500'}`}>
                                            Matfisk: {item.aiResult.edible}
                                        </span>
                                    )}
                                </div>

                                <CommentSection catchId={item.id} count={item.commentsCount || 0} />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
