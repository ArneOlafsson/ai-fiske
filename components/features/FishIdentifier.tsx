'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Card } from '@/components/ui/primitives';
import { Camera, Upload, Loader2, CheckCircle, AlertCircle, Utensils, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { AiResult } from '@/lib/types';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function FishIdentifier() {
    const { profile, user } = useAuth();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AiResult | null>(null);
    const [saved, setSaved] = useState(false);

    // Form State
    const [locationText, setLocationText] = useState('');
    const [waterType, setWaterType] = useState('sjö');
    const [comment, setComment] = useState('');
    const [isPublic, setIsPublic] = useState(false);

    const router = useRouter();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setUploadedUrl(null);
            setResult(null); // Reset result
        }
    };

    const handleIdentify = async () => {
        if (!profile?.isPremium) {
            alert("Du måste vara Premium-medlem för att använda AI-identifiering.");
            router.push('/profile');
            return;
        }
        if (profile.aiQuotaUsed >= profile.aiQuotaTotal) {
            alert("Din AI-kvot är slut. Kontakta support för påfyllning.");
            return;
        }

        setLoading(true);
        try {
            // 1. Upload Image to Storage (or send as base64 to API)
            // For MVP without real cloud functions, we might just simulate the analysis.
            // But standard way: Upload -> Get URL -> Send URL to API.
            // Or send file to API which uploads. 
            // Let's assume we send file to API to keep client simple? 
            // User requirement: "Ladda ner bilden från Storage" in Cloud Function.
            // So Client uploads first.

            if (!user) return;

            let downloadUrl = previewUrl || '';

            if (storage && user.uid) {
                try {
                    const storageRef = ref(storage, `catches/${user.uid}/${Date.now()}_${imageFile?.name || 'capture.jpg'}`);
                    const uploadRes = await uploadBytes(storageRef, imageFile as Blob);
                    downloadUrl = await getDownloadURL(uploadRes.ref);
                    setUploadedUrl(downloadUrl);
                    console.log("Image uploaded to Storage:", downloadUrl);
                } catch (e) {
                    console.warn("Upload failed", e);
                    alert("Kunde inte ladda upp bilden till molnet. Spara ändå för att spara lokalt.");
                }
            }

            // 2. Call API
            const response = await fetch('/api/identify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: downloadUrl,
                    locationText,
                    waterType
                })
            });

            if (!response.ok) throw new Error("Identifiering misslyckades");


            const data = await response.json();
            setResult(data.aiResult);

            // 3. Update Quota
            // Ideally handled by backend, but doing client-side update for MVP/MVP Rules
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                aiQuotaUsed: increment(1)
            });

        } catch (error) {
            console.error(error);
            alert("Något gick fel vid identifieringen.");
        } finally {
            setLoading(false);
        }
    };

    // Force reset loading on mount to fix stuck state
    useEffect(() => {
        setLoading(false);
        console.log("Force Reset Loading State");
    }, []);

    const handleSaveCatch = async () => {
        if (!user) return;

        console.log("Starting save process...");
        setLoading(true);

        // Safety valve: Force stop loading after 5 seconds no matter what
        // This is a last resort against UI freezing
        const safetyValve = setTimeout(() => {
            if (loading) {
                console.warn("Safety valve triggered!");
                setLoading(false);
                alert("Operation timed out (Safety Valve).");
            }
        }, 5000);

        try {
            // Prepare data
            const baseCatchData = {
                ownerUid: user.uid,
                imageUrl: uploadedUrl ?? previewUrl,
                locationText,
                waterType,
                comment,
                isPublic,
                aiResult: result,
                likesCount: 0,
            };

            // Attempt Save
            try {
                // Ultra-short timeout for cloud save during debugging
                const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1000));

                await Promise.race([
                    addDoc(collection(db, 'catches'), {
                        ...baseCatchData,
                        createdAt: serverTimestamp()
                    }),
                    timeout
                ]);
                console.log("Cloud save success");
            } catch (e) {
                console.warn("Cloud save failed, using local backup", e);
                // Local Fallback
                try {
                    const localCatch = {
                        ...baseCatchData,
                        id: 'local-' + Date.now(),
                        createdAt: Date.now()
                    };
                    const existing = JSON.parse(localStorage.getItem('local_catches') || '[]');
                    localStorage.setItem('local_catches', JSON.stringify([localCatch, ...existing]));
                    console.log("Local save success");
                } catch (localE) {
                    console.error("Local save failed", localE);
                    throw localE; // Re-throw to hit outer catch
                }
            }

            // If we didn't throw, we saved somewhere
            setSaved(true);

        } catch (e) {
            console.error("FATAL SAVE ERROR:", e);
            alert("Kunde inte spara. Försök igen.");
        } finally {
            clearTimeout(safetyValve);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-8">
            {!result ? (
                <Card className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Ladda upp fångst</h2>

                    <div className="mb-6">
                        <label className="block w-full aspect-video border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-secondary/5">
                            {previewUrl ? (
                                <div className="relative w-full h-full">
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                                    <div className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-colors flex items-center justify-center">
                                        <p className="text-white font-medium drop-shadow-md">Byt bild</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-4">
                                    <Camera className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-muted-foreground">Klicka för att ta foto eller välja bild</p>
                                </div>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                        </label>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="p-4 bg-secondary/10 rounded-lg text-center text-muted-foreground text-sm">
                            <p>Ladda upp en bild för att analysera art och hitta recept.</p>
                        </div>
                    </div>

                    <Button
                        className="w-full"
                        size="lg"
                        disabled={!imageFile || loading}
                        onClick={handleIdentify}
                    >
                        {loading ? (
                            <><Loader2 className="animate-spin mr-2" /> Analyserar...</>
                        ) : (
                            'Analysera Fångst'
                        )}
                    </Button>
                </Card>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <Card className="p-6 border-primary/20 bg-primary/5">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                                    {result.fishNameSv}
                                </h2>
                                <p className="text-lg text-muted-foreground italic">{result.fishNameLatin}</p>
                            </div>
                            <div className="bg-background/50 p-2 rounded-lg">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Konfidens</span>
                                <div className="text-lg font-bold">{(result.confidence || 0.95) * 100}%</div>
                            </div>
                        </div>

                        <p className="mb-4">{result.descriptionShort}</p>

                        <div className={`p-4 rounded-lg mb-4 flex items-start gap-3 ${result.edible === 'Ja' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            <Utensils className="w-5 h-5 mt-0.5" />
                            <div>
                                <span className="font-bold">Ätlig? {result.edible}</span>
                                <p className="text-sm text-foreground/80 mt-1">{result.edibleNotes}</p>
                            </div>
                        </div>

                        <Button className="w-full mb-4" onClick={() => setResult(null)} variant="outline">
                            Ta ny bild
                        </Button>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Utensils className="w-5 h-5 text-orange-500" />
                            Rekommenderat Recept: {result.recipeTitle}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-sm text-muted-foreground uppercase mb-2">Ingredienser</h4>
                                <ul className="list-disc list-inside space-y-1">
                                    {result.recipeIngredients.map((ing, i) => (
                                        <li key={i}>{ing}</li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-medium text-sm text-muted-foreground uppercase mb-2">Gör så här</h4>
                                <ol className="list-decimal list-inside space-y-2">
                                    {result.recipeSteps.map((step, i) => (
                                        <li key={i} className="pl-1 marker:text-primary font-medium text-foreground/90">{step}</li>
                                    ))}
                                </ol>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-border space-y-4">
                            {!saved && (
                                <div className="space-y-4">
                                    <h4 className="font-bold">Spara Fångst</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium mb-1 block">Plats</label>
                                            <Input
                                                placeholder="T.ex. Mälaren"
                                                value={locationText}
                                                onChange={(e) => setLocationText(e.target.value)}
                                                className="bg-background/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium mb-1 block">Vatten</label>
                                            <select
                                                className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={waterType}
                                                onChange={(e) => setWaterType(e.target.value)}
                                            >
                                                <option value="sjö">Sjö</option>
                                                <option value="hav">Hav</option>
                                                <option value="älv">Älv/Å</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium mb-1 block">Dina tankar</label>
                                        <Input
                                            placeholder="Berätta om fångsten..."
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            className="bg-background/50"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="isPublicResult"
                                            checked={isPublic}
                                            onChange={(e) => setIsPublic(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                                        />
                                        <label htmlFor="isPublicResult" className="text-sm cursor-pointer select-none">
                                            Dela publikt i Community
                                        </label>
                                    </div>
                                </div>
                            )}
                            {saved ? (
                                <Button className="w-full bg-green-500 hover:bg-green-600" disabled>
                                    <CheckCircle className="mr-2" /> Sparad i Loggboken
                                </Button>
                            ) : (
                                <Button
                                    className="w-full bg-primary hover:bg-primary/90 text-white"
                                    onClick={handleSaveCatch}
                                // Disabled removed to prevent locking
                                >
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Spara Fångst
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
