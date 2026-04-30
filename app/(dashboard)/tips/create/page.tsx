'use client';


import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input, Card } from '@/components/ui/primitives';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { Loader2, Upload, AlertCircle, ArrowLeft, Camera, Video } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function CreateTipPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [inputKey, setInputKey] = useState(Date.now());

    if (loading) return null;

    // Strict Permission Check
    const canCreate = profile?.role === 'admin' || user?.email === 'johan@animaldeli.com' || (user?.email === 'arne@olafsson.se' || user?.email === 'arne.olafsson@gmail.com');

    if (!canCreate) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Åtkomst nekad</h1>
                <p className="text-muted-foreground">Du har inte behörighet att skapa inlägg.</p>
                <Link href="/tips" className="mt-6">
                    <Button variant="outline">Tillbaka</Button>
                </Link>
            </div>
        );
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, explicitType: 'image' | 'video') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            const isVideo = file.type.startsWith('video/');
            const maxSize = isVideo ? 300 * 1024 * 1024 : 20 * 1024 * 1024; // 300MB video, 20MB image
            
            if (file.size > maxSize) {
                alert(`Filen är för stor. Maxstorlek är ${isVideo ? '300MB för film' : '20MB för bild'}. Din fil är ${(file.size / (1024*1024)).toFixed(1)}MB.`);
                return;
            }
            
            let actualMediaType = explicitType;
            if (file.type.startsWith('video/')) {
                actualMediaType = 'video';
            } else if (file.type.startsWith('image/')) {
                actualMediaType = 'image';
            }
            
            setMediaType(actualMediaType);
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleClearSelection = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setImageFile(null);
        setInputKey(Date.now());
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content || !imageFile) {
            alert("Vänligen fyll i alla fält och välj en bild.");
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Upload Media
            let imageUrl = '';
            
            let fileExt = mediaType === 'video' ? 'mp4' : 'jpg';
            if (mediaType === 'video' && imageFile.name) {
                const parts = imageFile.name.split('.');
                if (parts.length > 1) {
                    fileExt = parts[parts.length - 1];
                }
            }

            if (storage && user) {
                const storageRef = ref(storage, `tips/${user.uid}/${Date.now()}_${imageFile.name || 'upload.' + fileExt}`);
                const metadata = {
                    contentType: mediaType === 'video' ? (imageFile.type || 'video/mp4') : (imageFile.type || 'image/jpeg'),
                };
                
                const uploadTask = uploadBytesResumable(storageRef, imageFile, metadata);

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
            }

            // 2. Save Post
            await addDoc(collection(db, 'posts'), {
                title,
                content, // Stored as raw text/markdown
                imageUrl,
                mediaType, // Save media type for correct rendering
                authorName: profile?.displayName || 'Johan Bertlid',
                authorUid: user?.uid,
                createdAt: serverTimestamp(),
                likesCount: 0,
                commentsCount: 0
            });

            alert("Inlägg publicerat!");
            router.push('/tips');
        } catch (error: any) {
            console.error("Error creating post:", error);
            alert("Kunde inte skapa inlägg: " + error.message);
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/tips">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Tillbaka
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Skapa nytt Tips</h1>
            </div>

            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Titel</label>
                        <Input
                            placeholder="T.ex. Bästa draget för vårgädda"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Välj Media (Omslag)</label>
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
                                    <input key={`vid-${inputKey}`} type="file" accept="video/mp4, video/webm, video/quicktime" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileSelect(e, 'video')} />
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
                                    className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-700 text-white z-20"
                                    onClick={handleClearSelection}
                                >
                                    Ta bort
                                </Button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Innehåll</label>
                        <textarea
                            className="flex min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Skriv dina tips här..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full relative overflow-hidden" size="lg" disabled={isSubmitting || !imageFile}>
                        {isSubmitting && (
                            <div 
                                className="absolute left-0 top-0 bottom-0 bg-black/20 transition-all duration-300" 
                                style={{ width: `${uploadProgress}%` }}
                            />
                        )}
                        <span className="relative flex items-center z-10 justify-center w-full">
                            {isSubmitting ? (
                                <><Loader2 className="animate-spin mr-2" /> Publicerar ({uploadProgress}%)</>
                            ) : (
                                'Publicera Inlägg'
                            )}
                        </span>
                    </Button>
                </form>
            </Card>
        </div>
    );
}
