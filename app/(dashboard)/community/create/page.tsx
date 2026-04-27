'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input, Card } from '@/components/ui/primitives';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { Loader2, Upload, ArrowLeft, Camera, Video } from 'lucide-react';
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
    const [uploadProgress, setUploadProgress] = useState(0);

    if (loading) return null;

    // Helper to compress image efficiently without large Base64 strings
    const compressImageToBlob = async (blobUrl: string): Promise<Blob> => {
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
                // Compress to JPEG directly to Blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("Canvas toBlob failed"));
                    },
                    'image/jpeg',
                    0.7
                );
            };
            img.onerror = reject;
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, explicitType: 'image' | 'video') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setMediaType(explicitType);
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
                        uploadBlob = await compressImageToBlob(previewUrl);
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
                
                // Use uploadBytesResumable for progress tracking (crucial for large videos)
                const { uploadBytesResumable } = await import('firebase/storage');
                const uploadTask = uploadBytesResumable(storageRef, uploadBlob, metadata);

                imageUrl = await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setUploadProgress(Math.round(progress));
                        },
                        (error) => {
                            reject(error);
                        },
                        async () => {
                            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(downloadUrl);
                        }
                    );
                });
            } else if (!user) {
                throw new Error("Du måste vara inloggad för att ladda upp.");
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

            // Reset state
            setSpecies('');
            setLocationText('');
            setWaterType('sjö');
            setComment('');
            setImageFile(null);
            setPreviewUrl(null);

            alert("Fångst uppladdad till Community!");
            router.push('/community');
        } catch (error: any) {
            console.error("Error creating post:", error);
            alert("Kunde inte lägga upp: " + error.message);
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={isSubmitting ? "#" : "/community"} onClick={(e) => {
                    if (isSubmitting) {
                        e.preventDefault();
                        alert("Vänta tills uppladdningen är klar.");
                    }
                }}>
                    <Button variant="ghost" size="sm" disabled={isSubmitting}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Tillbaka
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Lägg ut i Community</h1>
            </div>

            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Välj Media</label>
                        {!previewUrl ? (
                            <div className="grid grid-cols-2 gap-4">
                                <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 bg-secondary/5 transition-colors overflow-hidden">
                                    <Camera className="w-8 h-8 mb-2 text-teal-600" />
                                    <span className="text-sm font-medium">Ladda upp Bild</span>
                                    <input key={Date.now() + "img"} type="file" accept="image/*, image/heic, image/heif" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileSelect(e, 'image')} />
                                </label>
                                <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 bg-secondary/5 transition-colors overflow-hidden">
                                    <Video className="w-8 h-8 mb-2 text-teal-600" />
                                    <span className="text-sm font-medium">Ladda upp Film</span>
                                    <input key={Date.now() + "vid"} type="file" accept="video/*, video/mp4, video/quicktime" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileSelect(e, 'video')} />
                                </label>
                            </div>
                        ) : (
                            <div className="w-full aspect-video relative rounded-xl overflow-hidden border-2 border-border shadow-sm">
                                {mediaType === 'video' ? (
                                    <video src={previewUrl} controls playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover bg-black" />
                                ) : (
                                    <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover bg-secondary/10" />
                                )}
                                <Button 
                                    type="button" 
                                    variant="destructive" 
                                    size="sm" 
                                    className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-700 text-white"
                                    onClick={() => {
                                        setPreviewUrl(null);
                                        setImageFile(null);
                                    }}
                                >
                                    Ta bort
                                </Button>
                            </div>
                        )}
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

                    <Button type="submit" className="w-full relative overflow-hidden" size="lg" disabled={isSubmitting}>
                        {isSubmitting && (
                            <div 
                                className="absolute left-0 top-0 bottom-0 bg-black/20 transition-all duration-300" 
                                style={{ width: `${uploadProgress}%` }}
                            />
                        )}
                        <span className="relative flex items-center z-10">
                            {isSubmitting ? (
                                <><Loader2 className="animate-spin mr-2" /> Laddar upp ({uploadProgress}%)</>
                            ) : (
                                <><Upload className="w-4 h-4 mr-2" /> Dela i Community</>
                            )}
                        </span>
                    </Button>
                </form>
            </Card>
        </div>
    );
}
