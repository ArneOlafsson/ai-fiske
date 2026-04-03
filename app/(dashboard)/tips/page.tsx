'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button, Card } from '@/components/ui/primitives';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Plus, Clock, MessageSquare, ChevronRight, Lightbulb } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

interface Post {
    id: string;
    title: string;
    content: string;
    imageUrl: string;
    authorName: string;
    createdAt: any;
    commentsCount?: number;
}

export default function TipsPage() {
    const { user, profile } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    const canCreate = profile?.role === 'admin' || user?.email === 'johan@animaldeli.com' || user?.email === 'arne@olafsson.se';

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                const postsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Post[];
                setPosts(postsData);
            } catch (error) {
                console.error("Error fetching posts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Lightbulb className="w-8 h-8 text-primary" />
                        Tips & Trix
                    </h1>
                    <p className="text-muted-foreground">Lär dig av proffsen</p>
                </div>
                {canCreate && (
                    <Link href="/tips/create">
                        <Button className="bg-primary hover:bg-primary/90 text-white">
                            <Plus className="w-4 h-4 mr-2" /> Skapa Tips
                        </Button>
                    </Link>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-secondary/20 rounded-xl" />
                    ))}
                </div>
            ) : posts.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground bg-secondary/5 border-dashed">
                    <p>Inga tips har publicerats än.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map(post => (
                        <Link href={`/tips/${post.id}`} key={post.id} className="group">
                            <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 group-hover:-translate-y-1">
                                <div className="aspect-video relative overflow-hidden bg-secondary/10">
                                    {post.imageUrl ? (
                                        <img
                                            src={post.imageUrl}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-secondary/20">
                                            <span className="text-muted-foreground">Ingen bild</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 space-y-3">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                            {post.authorName}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {post.createdAt?.seconds ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: sv }) : 'Nyss'}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                        {post.title}
                                    </h3>

                                    <p className="text-muted-foreground text-sm line-clamp-3">
                                        {post.content}
                                    </p>

                                    <div className="pt-4 mt-auto flex items-center justify-between text-sm text-muted-foreground border-t border-border/40">
                                        <div className="flex items-center gap-1">
                                            <MessageSquare className="w-4 h-4" />
                                            <span>{post.commentsCount || 0} kommentarer</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                            Läs mer <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
