'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input } from '@/components/ui/primitives';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { Comment } from '@/lib/types';
import { MessageSquare, Trash2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

interface CommentSectionProps {
    catchId: string;
    count?: number;
}

export default function CommentSection({ catchId, count = 0 }: CommentSectionProps) {
    const { user, profile } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        if (catchId.startsWith('mock-')) {
            const MOCK_COMMENTS: Record<string, Comment[]> = {
                'mock-1': [
                    { id: 'mc-1', uid: 'u2', displayName: 'Pelle', text: 'Wow, vilken best! Grattis!', createdAt: { seconds: Date.now() / 1000 - 3600 } } as any,
                    { id: 'mc-2', uid: 'u3', displayName: 'Lisa', text: 'Vad tog den på?', createdAt: { seconds: Date.now() / 1000 - 1800 } } as any
                ],
                'mock-2': [
                    { id: 'mc-3', uid: 'u4', displayName: 'Kalle', text: 'Ser gott ut! Smörstekt är bäst.', createdAt: { seconds: Date.now() / 1000 - 7200 } } as any
                ],
                'mock-3': [
                    { id: 'mc-4', uid: 'u5', displayName: 'Anna', text: 'Drömfisk! Var i Mörrumsån?', createdAt: { seconds: Date.now() / 1000 - 86400 } } as any
                ]
            };
            setComments(MOCK_COMMENTS[catchId] || []);
            return;
        }

        if (catchId.startsWith('local-')) {
            const localComments = JSON.parse(localStorage.getItem(`comments_${catchId}`) || '[]');
            setComments(localComments);
            return;
        }

        const q = query(
            collection(db, 'catches', catchId, 'comments'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Comment[]);
        });

        return () => unsubscribe();
    }, [catchId, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        setLoading(true);
        try {
            if (catchId.startsWith('local-')) {
                const newC: Comment = {
                    id: 'local-comment-' + Date.now(),
                    uid: user.uid,
                    displayName: profile?.displayName || 'Du',
                    photoURL: profile?.photoURL,
                    text: newComment.trim(),
                    createdAt: { seconds: Date.now() / 1000 } as any,
                };
                const existing = JSON.parse(localStorage.getItem(`comments_${catchId}`) || '[]');
                const updated = [...existing, newC];
                localStorage.setItem(`comments_${catchId}`, JSON.stringify(updated));
                setComments(updated);

                // Update Parent Count in LocalStorage
                const localCatches = JSON.parse(localStorage.getItem('local_catches') || '[]');
                const catchIndex = localCatches.findIndex((c: any) => c.id === catchId);
                if (catchIndex >= 0) {
                    localCatches[catchIndex].commentsCount = (localCatches[catchIndex].commentsCount || 0) + 1;
                    localStorage.setItem('local_catches', JSON.stringify(localCatches));
                }

                setNewComment('');
                setLoading(false);
                return;
            }

            if (user.uid.startsWith('dev-')) {
                // Dev Mode Mock
                setComments(prev => [...prev, {
                    id: 'mock-' + Date.now(),
                    uid: user.uid,
                    displayName: profile?.displayName || 'Dev User',
                    text: newComment,
                    createdAt: { seconds: Date.now() / 1000 },
                } as any]);
                setNewComment('');
                setLoading(false);
                return;
            }

            await addDoc(collection(db, 'catches', catchId, 'comments'), {
                uid: user.uid,
                displayName: profile?.displayName || user.email?.split('@')[0] || 'Anonym',
                photoURL: profile?.photoURL || user.photoURL,
                text: newComment.trim(),
                createdAt: serverTimestamp()
            });

            // Update parent count
            await updateDoc(doc(db, 'catches', catchId), {
                commentsCount: increment(1)
            });

            setNewComment('');
        } catch (err) {
            console.error("Failed to post comment", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm("Ta bort kommentar?")) return;
        try {
            if (user?.uid.startsWith('dev-')) {
                setComments(prev => prev.filter(c => c.id !== commentId));
                return;
            }
            await deleteDoc(doc(db, 'catches', catchId, 'comments', commentId));
            // Update parent count
            await updateDoc(doc(db, 'catches', catchId), {
                commentsCount: increment(-1)
            });
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    return (
        <div className="mt-4">
            <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary w-full flex items-center justify-center gap-2"
                onClick={() => setIsOpen(!isOpen)}
            >
                <MessageSquare className="w-4 h-4" />
                {isOpen ? 'Dölj kommentarer' : `Visa kommentarer (${Math.max(count, comments.length)})`}
            </Button>

            {isOpen && (
                <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                    {comments.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-4">Inga kommentarer än. Bli först!</p>
                    )}

                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {comments.map((comment) => (
                            <div key={comment.id} className="bg-secondary/30 p-3 rounded-lg text-sm group">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-accent">{comment.displayName}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {comment.createdAt?.seconds ? formatDistanceToNow(new Date(comment.createdAt.seconds * 1000), { addSuffix: true, locale: sv }) : 'nyss'}
                                        </span>
                                        {(user?.uid === comment.uid || profile?.role === 'admin') && (
                                            <button onClick={() => handleDelete(comment.id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p>{comment.text}</p>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Skriv en kommentar..."
                            disabled={loading}
                            className="flex-1"
                        />
                        <Button type="submit" size="sm" disabled={loading || !newComment.trim()}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
            )}
        </div>
    );
}
