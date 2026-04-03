'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input, Card } from '@/components/ui/primitives';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { Loader2, Upload, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateEquipmentPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (loading) return null;

    // Strict Permission Check
    const canCreate = profile?.role === 'admin' || user?.email === 'johan@animaldeli.com' || user?.email === 'arne@olafsson.se';

    if (!canCreate) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Åtkomst nekad</h1>
                <p className="text-muted-foreground">Du har inte behörighet att lägga till utrustning & bete.</p>
                <Link href="/equipment" className="mt-6">
                    <Button variant="outline">Tillbaka</Button>
                </Link>
            </div>
        );
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content || !imageFile) {
            alert("Vänligen fyll i alla fält och välj en bild.");
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Upload Image
            let imageUrl = '';
            if (storage && user) {
                const storageRef = ref(storage, `equipment/${user.uid}/${Date.now()}_${imageFile.name}`);
                const uploadRes = await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(uploadRes.ref);
            }

            // 2. Save Equipment
            await addDoc(collection(db, 'equipment'), {
                title,
                content, // Stored as raw text/markdown
                imageUrl,
                authorName: profile?.displayName || 'Johan (Animal Deli)',
                authorUid: user?.uid,
                createdAt: serverTimestamp(),
                likesCount: 0,
                commentsCount: 0
            });

            alert("Inlägg publicerat!");
            router.push('/equipment');
        } catch (error: any) {
            console.error("Error creating post:", error);
            alert("Kunde inte skapa inlägg: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/equipment">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Tillbaka
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Lägg till Utrustning / Bete</h1>
            </div>

            <Card className="p-6 border-teal-500/20">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Titel</label>
                        <Input
                            placeholder="T.ex. Bästa draget för vårgädda"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-background"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Omslagsbild</label>
                        <div className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:bg-secondary/20 transition-colors relative h-48 flex items-center justify-center overflow-hidden">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                                <div className="text-muted-foreground">
                                    <Upload className="w-8 h-8 mx-auto mb-2 text-teal-600" />
                                    <p>Klicka eller dra bild här</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Innehåll & Beskrivning</label>
                        <textarea
                            className="flex min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Skriv informationen här..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <><Loader2 className="animate-spin mr-2" /> Publicerar...</>
                        ) : (
                            'Publicera Inlägg'
                        )}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
