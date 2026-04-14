'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input, Card } from '@/components/ui/primitives';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { ArrowLeft, Send, Lock, User, Clock, Crown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { use } from 'react';

interface Reply {
    id: string;
    text: string;
    authorName: string;
    authorUid: string;
    createdAt: string;
}

interface Comment {
    id: string;
    text: string;
    authorName: string;
    authorUid: string;
    createdAt: any;
    replies?: Reply[];
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
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

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

    const handlePostReply = async (commentId: string) => {
        if (!replyText.trim() || !user) return;
        
        try {
            const commentRef = doc(db, 'equipment', id, 'comments', commentId);
            await updateDoc(commentRef, {
                replies: arrayUnion({
                    id: Date.now().toString(),
                    text: replyText,
                    authorName: profile?.displayName || 'Admin',
                    authorUid: user.uid,
                    createdAt: new Date().toISOString()
                })
            });
            setReplyingTo(null);
            setReplyText('');
        } catch (error) {
            console.error("Error posting reply:", error);
            alert("Kunde inte skicka svar.");
        }
    };

    if (loading) return <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;
    if (!equipment) return <div className="p-12 text-center text-muted-foreground">Inlägget hittades inte.</div>;

    const isAdmin = 
        user?.email?.toLowerCase().trim() === 'johan@animaldeli.com' || 
        user?.email?.toLowerCase().trim() === 'arne@olafsson.se' ||
        profile?.email?.toLowerCase().trim() === 'johan@animaldeli.com' ||
        profile?.email?.toLowerCase().trim() === 'arne@olafsson.se' ||
        profile?.role === 'admin';
    const isPremium = profile?.isPremium || isAdmin;
    const canReply = isAdmin || equipment?.authorUid === user?.uid;

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
                                
                                {comment.replies && comment.replies.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {comment.replies.map(reply => (
                                            <div key={reply.id} className="p-3 bg-secondary/10 rounded-lg border-l-2 border-teal-500/50 relative">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Crown className="w-3 h-3 text-teal-600" />
                                                    <span className="font-semibold text-xs text-teal-600">{reply.authorName}</span>
                                                    <span className="text-[10px] text-muted-foreground ml-auto">
                                                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: sv })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground/90">{reply.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {canReply && (
                                    <div className="mt-3 pt-3 border-t border-border/10">
                                        {replyingTo === comment.id ? (
                                            <div className="flex gap-2 items-center bg-background/50 p-2 rounded-md border border-teal-500/20">
                                                <Input 
                                                    className="h-8 text-sm focus-visible:ring-teal-500" 
                                                    placeholder="Skriv ett svar..." 
                                                    value={replyText} 
                                                    onChange={e => setReplyText(e.target.value)}
                                                    autoFocus
                                                />
                                                <Button size="sm" className="h-8 px-3 bg-teal-600 hover:bg-teal-700" onClick={() => handlePostReply(comment.id)}>Svara</Button>
                                                <Button size="sm" variant="ghost" className="h-8 px-2 hover:text-teal-600" onClick={() => { setReplyingTo(null); setReplyText(''); }}>Avbryt</Button>
                                            </div>
                                        ) : (
                                            <Button variant="outline" size="sm" className="h-7 px-3 text-xs font-semibold bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 border-teal-500/20" onClick={() => setReplyingTo(comment.id)}>
                                                Svara
                                            </Button>
                                        )}
                                    </div>
                                )}
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
