'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button, Card } from '@/components/ui/primitives';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Plus, Clock, MessageSquare, ChevronRight, Anchor } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

interface Equipment {
    id: string;
    title: string;
    content: string;
    imageUrl: string;
    authorName: string;
    createdAt: any;
    commentsCount?: number;
}

export default function EquipmentPage() {
    const { user, profile } = useAuth();
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);

    const canCreate = profile?.role === 'admin' || user?.email === 'johan@animaldeli.com' || (user?.email === 'arne@olafsson.se' || user?.email === 'arne.olafsson@gmail.com');

    useEffect(() => {
        const fetchEquipment = async () => {
            try {
                const q = query(collection(db, 'equipment'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Equipment[];
                setEquipment(data);
            } catch (error) {
                console.error("Error fetching equipment:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEquipment();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Anchor className="w-8 h-8 text-teal-500" /> 
                        Utrustning & Bete
                    </h1>
                    <p className="text-muted-foreground">Rekommendationer och tips</p>
                </div>
                {canCreate && (
                    <Link href="/equipment/create">
                        <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                            <Plus className="w-4 h-4 mr-2" /> Lägg till
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
            ) : equipment.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground bg-secondary/5 border-dashed">
                    <p>Ingen utrustning eller bete har publicerats än.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {equipment.map(item => (
                        <Link href={`/equipment/${item.id}`} key={item.id} className="group">
                            <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 group-hover:-translate-y-1">
                                <div className="aspect-square relative overflow-hidden bg-secondary/10">
                                    {item.imageUrl ? (
                                        <img
                                            src={item.imageUrl}
                                            alt={item.title}
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
                                        <span className="bg-teal-500/10 text-teal-600 px-2 py-0.5 rounded-full font-medium">
                                            {item.authorName}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {item.createdAt?.seconds ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true, locale: sv }) : 'Nyss'}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold line-clamp-2 leading-tight group-hover:text-teal-600 transition-colors">
                                        {item.title}
                                    </h3>

                                    <p className="text-muted-foreground text-sm line-clamp-3">
                                        {item.content}
                                    </p>

                                    <div className="pt-4 mt-auto flex items-center justify-between text-sm text-muted-foreground border-t border-border/40">
                                        <div className="flex items-center gap-1">
                                            <MessageSquare className="w-4 h-4" />
                                            <span>{item.commentsCount || 0} kommentarer</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-teal-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
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
