'use client';

import { Card } from '@/components/ui/primitives';
import { AlertTriangle, MapPin, ExternalLink } from 'lucide-react';

export default function FredningsomradenPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto space-y-4 pb-4 animate-in fade-in duration-500">
            <div className="text-center md:text-left pt-2">
                <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
                    <MapPin className="text-primary" />
                    Fredningsområden & Fiskeregler
                </h1>
                <p className="text-muted-foreground mt-2">
                    Kontrollera alltid gällande regler innan du fiskar.
                </p>
            </div>

            <Card className="p-4 border-l-4 border-red-500 bg-red-500/10">
                <div className="flex gap-3 items-start">
                    <AlertTriangle className="text-red-500 shrink-0 w-6 h-6 mt-1" />
                    <div>
                        <h3 className="font-bold text-red-500 mb-1">Viktig Information</h3>
                        <p className="text-sm text-white/80 leading-relaxed">
                            Det är <strong className="text-white">ditt eget ansvar</strong> att känna till och följa de lokala fiskereglerna. 
                            Rött markerade områden i kartan nedan innebär oftast totalt fiskeförbud, eller förbud under specifika tider på året för att skydda lekande fisk. 
                            Klicka på områdena i kartan för mer detaljerad information.
                        </p>
                    </div>
                </div>
            </Card>

            <Card className="flex-1 overflow-hidden border-primary/20 flex flex-col relative shadow-lg shadow-black/20">
                <div className="bg-[#132738] p-3 px-4 flex justify-between items-center text-sm border-b border-[#1E3A54]">
                    <span className="font-bold flex items-center gap-2 text-white">
                        <MapPin className="w-4 h-4 text-primary" />
                        Officiell karta (Svenska Fiskeregler)
                    </span>
                    <a href="https://www.svenskafiskeregler.se/" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:text-white transition-colors">
                        <span className="hidden sm:inline">Öppna i nytt fönster</span> 
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
                <iframe 
                    src="https://www.svenskafiskeregler.se/" 
                    className="w-full flex-1 border-0 bg-white"
                    title="Svenska Fiskeregler Karta"
                    allowFullScreen
                />
            </Card>
        </div>
    );
}
