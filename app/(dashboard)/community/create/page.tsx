'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input, Card } from '@/components/ui/primitives';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { Loader2, Upload, ArrowLeft, Camera } from 'lucide-react';
import Link from 'next/link';

export default function CreateCommunityPostPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    const [species, setSpecies] = useState('');
    const [locationText, setLocationText] = useState('');
    const [waterType, setWaterType] = useState('sjö');
    const [comment, setComment] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (loading) return null;

    // Helper to compress image
    const blobToBase64 = async (blobUrl: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.src = blobUrl;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // Resize to max 800px width
                const scale = MAX_WIDTH / img.width;
                const width = scale < 1 ? MAX_WIDTH : img.width;
                const height = scale < 1 ? img.height * scale : img.height;

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context failed"));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                // Compress to JPEG
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            
            const isVideo = file.type.startsWith('video/') || (file.name && /\.(mp4|mov|webm|mkv|avchd)$/i.test(file.name));
            setMediaType(isVideo ? 'video' : 'image');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageFile) {
            alert("Du måste välja en bild.");
            return;
        }

        setIsSubmitting(true);

        try {
            // Process Image or Video
            let uploadBlob: Blob = imageFile as Blob;
            if (mediaType === 'image') {
                try {
                    if (previewUrl) {
                        const b64 = await blobToBase64(previewUrl);
                        const res = await fetch(b64);
                        uploadBlob = await res.blob();
                    }
                } catch (err) {
                    console.warn("Compression failed", err);
                }
            }

            // Upload File
            let imageUrl = '';
            
            let fileExt = mediaType === 'video' ? 'mp4' : 'jpg';
            if (mediaType === 'video' && imageFile.name) {
                const parts = imageFile.name.split('.');
                if (parts.length > 1) {
                    fileExt = parts[parts.length - 1];
                }
            }

            if (storage && user) {
                const storageRef = ref(storage, `catches/${user.uid}/${Date.now()}_capture.${fileExt}`);
                const metadata = {
                    contentType: mediaType === 'video' ? (imageFile.type || 'video/mp4') : 'image/jpeg',
                };
                const uploadRes = await uploadBytes(storageRef, uploadBlob, metadata);
                imageUrl = await getDownloadURL(uploadRes.ref);
            }

            // Save Post to catches collection
            await addDoc(collection(db, 'catches'), {
                ownerUid: user?.uid,
                ownerName: profile?.displayName || user?.email || 'Anonym',
                imageUrl,
                mediaType,
                locationText,
                waterType,
                comment,
                isPublic: true,
                likesCount: 0,
                commentsCount: 0,
                createdAt: serverTimestamp(),
                aiResult: {
                    fishNameSv: species || 'Fångst',
                    fishNameLatin: 'Manuell inmatning',
                    confidence: 1.0,
                    descriptionShort: '',
                    edible: 'Beror på',
                    edibleNotes: '',
                    recipeTitle: '',
                    recipeIngredients: [],
                    recipeSteps: [],
                    cookingMethod: ''
                }
            });

            alert("Fångst uppladdad till Community!");
            router.push('/community');
        } catch (error: any) {
            console.error("Error creating post:", error);
            alert("Kunde inte lägga upp: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/community">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Tillbaka
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Lägg ut i Community</h1>
            </div>

            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Välj Bild</label>
                        <label className="block w-full aspect-video border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-secondary/5 relative overflow-hidden">
                            {previewUrl ? (
                                mediaType === 'video' ? (
                                    <video src={previewUrl} controls playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                                ) : (
                                    <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                )
                            ) : (
                                <div className="text-center p-4 relative z-10">
                                    <Camera className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-muted-foreground">Klicka för att ladda upp bild eller film</p>
                                </div>
                            )}
                            <input type="file" className="hidden" onChange={handleFileSelect} required />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Art (Frivilligt)</label>
                            <Input
                                placeholder="T.ex. Gädda"
                                value={species}
                                onChange={(e) => setSpecies(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Plats (Frivilligt)</label>
                            <Input
                                placeholder="T.ex. Mälaren"
                                value={locationText}
                                onChange={(e) => setLocationText(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Vattentyp</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={waterType}
                            onChange={(e) => setWaterType(e.target.value)}
                        >
                            <option value="sjö">Sjö</option>
                            <option value="hav">Hav</option>
                            <option value="älv">Älv/Å</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Beskriv din fångst</label>
                        <textarea
                            className="flex min-h-[120px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="Berätta om fiskenutrustningen, vädret..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <><Loader2 className="animate-spin mr-2" /> Laddar upp...</>
                        ) : (
                            <><Upload className="w-4 h-4 mr-2" /> Dela i Community</>
                        )}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
