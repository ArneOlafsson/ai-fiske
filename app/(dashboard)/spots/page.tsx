'use client';

import { useState } from 'react';
import { Button, Input, Card } from '@/components/ui/primitives';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { FishingSpot } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

const SPECIES_LIST = ["Gädda", "Abborre", "Gös", "Öring", "Lax", "Torsk", "Makrill", "Sik", "Röding", "Braxen"];

export default function SpotsPage() {
    const { profile } = useAuth();
    const [species, setSpecies] = useState(SPECIES_LIST[0]);
    const [area, setArea] = useState('');
    const [loading, setLoading] = useState(false);
    const [spots, setSpots] = useState<FishingSpot[] | null>(null);
    const router = useRouter();

    const handleSearch = async () => {
        if (!profile?.isPremium) {
            router.push('/profile');
            return;
        }
        if (profile.aiQuotaUsed >= profile.aiQuotaTotal) {
            alert("Din AI-kvot är slut.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/spots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ species, area })
            });
            const data = await res.json();
            setSpots(data.spots);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold">Hitta Fiskevatten</h1>
                <p className="text-muted-foreground">AI-analys av kartdata och fångstrapporter för att hitta bästa platserna.</p>
            </div>

            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Fiskart</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={species}
                            onChange={(e) => setSpecies(e.target.value)}
                        >
                            {SPECIES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Område / Sjö</label>
                        <Input
                            placeholder="T.ex. Stockholm skärgård"
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                        />
                    </div>
                </div>
                <Button className="w-full" size="lg" onClick={handleSearch} disabled={loading || !area}>
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2 w-4 h-4" />}
                    Hitta Smultronställen
                </Button>
            </Card>

            {spots && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <h2 className="text-xl font-bold">Rekommenderade Platser</h2>
                    {spots.map((spot, i) => (
                        <Card key={i} className="p-5 hover:border-primary/50 transition-colors">
                            <div className="flex items-start gap-3">
                                <MapPin className="text-red-500 w-6 h-6 mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="text-lg font-bold">{spot.name}</h3>
                                    <div className="flex gap-2 text-sm text-muted-foreground mb-2">
                                        <span className="bg-secondary px-2 py-0.5 rounded">{spot.type}</span>
                                        <span className="bg-secondary px-2 py-0.5 rounded">{spot.season}</span>
                                    </div>
                                    <p className="text-foreground/90">{spot.tips}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
