'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input, Card } from '@/components/ui/primitives';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { ArrowLeft, Send, Lock, User, Clock, Crown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { use } from 'react';

interface Comment {
    id: string;
    text: string;
    authorName: string;
    authorUid: string;
    createdAt: any;
}

export default function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // Next.js 15: params is a promise
    const { id } = use(params);

    const { user, profile } = useAuth();
    const [equipment, setEquipment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchEquipment = async () => {
            try {
                const docRef = doc(db, 'equipment', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setEquipment({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setEquipment(null);
                }
            } catch (e) {
                console.error("Error fetching equipment", e);
            } finally {
                setLoading(false);
            }
        };

        fetchEquipment();

        // Real-time comments
        const commentsRef = collection(db, 'equipment', id, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Comment[];
            setComments(cData);
        });

        return () => unsubscribe();
    }, [id]);

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        setSubmitting(true);
        try {
            const commentsRef = collection(db, 'equipment', id, 'comments');
            await addDoc(commentsRef, {
                text: newComment,
                authorName: profile?.displayName || 'Anonym',
                authorUid: user.uid,
                createdAt: serverTimestamp()
            });

            // Update comments count on equipment
            const postRef = doc(db, 'equipment', id);
            await updateDoc(postRef, {
                commentsCount: increment(1)
            });

            setNewComment('');
        } catch (error) {
            console.error("Error posting comment:", error);
            alert("Kunde inte skicka kommentar.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;
    if (!equipment) return <div className="p-12 text-center text-muted-foreground">Inlägget hittades inte.</div>;

    const isPremium = profile?.isPremium;

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            <Link href="/equipment">
                <Button variant="ghost" size="sm" className="pl-0 hover:pl-2 transition-all">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Tillbaka
                </Button>
            </Link>

            {/* Main Post */}
            <article className="space-y-6">
                <header className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="bg-teal-500/10 text-teal-600 px-3 py-1 rounded-full font-medium">
                            {equipment.authorName}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {equipment.createdAt?.seconds ? formatDistanceToNow(equipment.createdAt.toDate(), { addSuffix: true, locale: sv }) : ''}
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold leading-tight">{equipment.title}</h1>
                </header>

                {equipment.imageUrl && (
                    <div className="aspect-video relative rounded-2xl overflow-hidden shadow-lg border border-border/50">
                        <img src={equipment.imageUrl} alt={equipment.title} className="w-full h-full object-cover" />
                    </div>
                )}

                <div className="prose prose-lg dark:prose-invert max-w-none text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {equipment.content}
                </div>
            </article>

            <hr className="border-border/50" />

            {/* Comments Section */}
            <section className="space-y-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                    Frågor & Kommentarer
                    <span className="text-sm font-normal text-muted-foreground bg-secondary/30 px-2 py-1 rounded-full">{comments.length}</span>
                </h3>

                {/* Comment Form */}
                {isPremium ? (
                    <Card className="p-4 bg-secondary/5 border-teal-500/20">
                        <form onSubmit={handlePostComment} className="flex gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Ställ en fråga om utrustningen/betet..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="bg-background focus-visible:ring-teal-500"
                                />
                            </div>
                            <Button type="submit" disabled={!newComment.trim() || submitting} className="bg-teal-600 hover:bg-teal-700 text-white">
                                {submitting ? <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <Send className="w-4 h-4" />}
                            </Button>
                        </form>
                    </Card>
                ) : (
                    <Card className="p-6 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-teal-500/20 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <Lock className="w-6 h-6 text-teal-600" />
                            <h4 className="font-bold text-teal-700 dark:text-teal-500">Endast för Premium-medlemmar</h4>
                            <p className="text-sm text-muted-foreground mb-4">Uppgradera för att delta i diskussionen och ställa frågor till Johan.</p>
                            <Link href="/profile">
                                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                                    <Crown className="w-4 h-4 mr-2" /> Uppgradera Nu
                                </Button>
                            </Link>
                        </div>
                    </Card>
                )}

                {/* Comment List */}
                <div className="space-y-4">
                    {comments.map(comment => (
                        <div key={comment.id} className="flex gap-3 p-4 rounded-lg bg-secondary/5 hover:bg-secondary/10 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-teal-600" />
                            </div>
                            <div className="space-y-1 flex-1">
                                <div className="flex justify-between items-start">
                                    <span className="font-semibold text-sm">{comment.authorName}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {comment.createdAt?.seconds ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: sv }) : ''}
                                    </span>
                                </div>
                                <p className="text-sm text-foreground/80">{comment.text}</p>
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && (
                        <p className="text-center text-muted-foreground italic py-8">Inga frågor än. Bli den första!</p>
                    )}
                </div>
            </section>
        </div>
    );
}
