'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input, Card } from '@/components/ui/primitives';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { Loader2, Upload, ArrowLeft, Camera, Video } from 'lucide-react';
import Link from 'next/link';
import heic2any from 'heic2any';

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
    const [isConverting, setIsConverting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [inputKey, setInputKey] = useState(Date.now());
    
    // Keep track of all created blob URLs to revoke them only on unmount
    // This prevents Safari from reusing the same Blob UUID for consecutive images
    const blobUrlCache = useRef<string[]>([]);

    if (loading) return null;

    // No longer using client-side canvas compression due to severe memory limitations and hangs on iOS Safari.

    // Clean up Blob URLs ONLY on unmount to prevent Safari UUID reuse bugs
    useEffect(() => {
        return () => {
            blobUrlCache.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, explicitType: 'image' | 'video') => {
        if (e.target.files && e.target.files[0]) {
            let file: File = e.target.files[0];
            
            const isVideo = file.type.startsWith('video/');
            const maxSize = isVideo ? 50 * 1024 * 1024 : 20 * 1024 * 1024; // 50MB video, 20MB image
            
            if (file.size > maxSize) {
                alert(`Filen är för stor. Maxstorlek är ${isVideo ? '50MB för film' : '20MB för bild'}. Din fil är ${(file.size / (1024*1024)).toFixed(1)}MB.`);
                return;
            }
            
            let actualMediaType = explicitType;
            if (file.type.startsWith('video/')) {
                actualMediaType = 'video';
            } else if (file.type.startsWith('image/')) {
                actualMediaType = 'image';
            } else if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
                actualMediaType = 'image';
            }
            
            if (actualMediaType === 'image') {
                const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || 
                               file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
                
                if (isHeic) {
                    setIsConverting(true);
                    try {
                        const convertedBlob = await heic2any({
                            blob: file,
                            toType: "image/jpeg",
                            quality: 0.8
                        }) as Blob;
                        
                        file = new File([convertedBlob], file.name.replace(/\.heic$|\.heif$/i, '.jpg'), { type: 'image/jpeg' });
                    } catch (error) {
                        console.error("HEIC conversion failed:", error);
                        alert("Kunde inte konvertera HEIC-bilden. Prova att välja en annan bild.");
                        setIsConverting(false);
                        return; // Stop processing
                    }
                    setIsConverting(false);
                }
            }
            
            setImageFile(file);
            setMediaType(actualMediaType);
            
            let newUrl = URL.createObjectURL(file);
            blobUrlCache.current.push(newUrl);
            setPreviewUrl(newUrl);
        }
    };

    const handleClearSelection = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setImageFile(null);
        setInputKey(Date.now()); // Destroy and recreate the input DOM element
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
            const docRef = await addDoc(collection(db, 'catches'), {
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
                createdAt: Timestamp.now(),
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

            // Fallback: save directly to local_catches so it's guaranteed to be in the feed
            try {
                const localCatch = {
                    id: docRef.id,
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
                    createdAt: Date.now()
                };
                const existing = JSON.parse(localStorage.getItem('local_catches') || '[]');
                localStorage.setItem('local_catches', JSON.stringify([localCatch, ...existing].slice(0, 50)));
            } catch (e) {
                console.warn("Could not save to local_catches", e);
            }

            // Reset state
            setSpecies('');
            setLocationText('');
            setWaterType('sjö');
            setComment('');
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setImageFile(null);
            setPreviewUrl(null);
            setInputKey(Date.now()); // Completely clear the file input DOM to allow consecutive uploads
            // Navigate to feed
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
                                    <input key={`img-${inputKey}`} type="file" accept="image/jpeg, image/png, image/webp" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileSelect(e, 'image')} />
                                </label>
                                <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 bg-secondary/5 transition-colors overflow-hidden">
                                    <Video className="w-8 h-8 mb-2 text-teal-600" />
                                    <span className="text-sm font-medium">Ladda upp Film</span>
                                    <input key={`vid-${inputKey}`} type="file" accept="video/mp4, video/webm" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileSelect(e, 'video')} />
                                </label>
                            </div>
                        ) : isConverting ? (
                            <div className="w-full aspect-video flex flex-col items-center justify-center rounded-xl border-2 border-border bg-secondary/10">
                                <Loader2 className="w-10 h-10 animate-spin text-primary mb-2" />
                                <p className="text-sm font-medium text-muted-foreground">Bearbetar bild (HEIC)...</p>
                            </div>
                        ) : (
                            <div className="w-full aspect-video relative rounded-xl overflow-hidden border-2 border-border shadow-sm">
                                {mediaType === 'video' ? (
                                    <video 
                                        src={previewUrl} 
                                        controls 
                                        playsInline 
                                        preload="metadata" 
                                        className="absolute inset-0 w-full h-full object-cover bg-black" 
                                        onError={(e) => console.error("Video preview error", e)}
                                    />
                                ) : (
                                    <img 
                                        src={previewUrl} 
                                        alt="Preview" 
                                        className="absolute inset-0 w-full h-full object-cover bg-secondary/10" 
                                        onError={(e) => {
                                            console.error("Image preview error", e);
                                            // Fallback text if image cannot be rendered
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement?.insertAdjacentHTML('beforeend', '<div class="absolute inset-0 flex items-center justify-center text-sm text-center p-4 bg-secondary/20">Bilden är vald, men kan inte förhandsgranskas (okänt format).</div>');
                                        }}
                                    />
                                )}
                                <Button 
                                    type="button" 
                                    variant="destructive" 
                                    size="sm" 
                                    className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-700 text-white"
                                    onClick={handleClearSelection}
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
                            placeholder="Berätta om fisken, utrustningen, vädret..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                    </div>

                    <Button type="submit" className="w-full relative overflow-hidden" size="lg" disabled={isSubmitting || isConverting || !imageFile}>
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
