'use client';

import { Share, PlusSquare, MoreVertical, Smartphone, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";
import InstallPwaButton from "@/components/InstallPwaButton";

export default function InstallGuidePage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto pb-10">
            <header className="space-y-2">
                <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-white transition-colors mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Tillbaka till Dashboard
                </Link>
                <h2 className="text-primary font-bold text-xs tracking-widest uppercase">Guide</h2>
                <h1 className="text-4xl font-serif text-white flex items-center gap-3">
                    <Download className="w-8 h-8 text-primary" />
                    Ladda ner Appen
                </h1>
                <p className="text-muted-foreground text-lg leading-relaxed">
                    Eftersom Fiskeappen är en modern webbapp slipper du App Store eller Google Play. Du lägger enkelt till den direkt på din hemskärm!
                </p>
            </header>

            <div className="flex flex-col gap-6">
                <div className="bg-[#132738] border border-[#1E3A54] p-6 rounded-2xl shadow-lg">
                    <h3 className="font-bold text-xl mb-4 flex items-center gap-3 text-white">
                        <span className="text-2xl">🍎</span> För iPhone (Safari)
                    </h3>
                    <ol className="space-y-4 text-muted-foreground text-base">
                        <li className="flex gap-4 items-start">
                            <span className="font-bold text-white bg-[#1E3A54] w-6 h-6 flex items-center justify-center rounded-full text-sm shrink-0">1</span>
                            <span className="mt-0.5">Längst ner på Safari-skärmen, tryck på <strong>Dela-ikonen</strong> <Share className="inline w-5 h-5 mx-1 text-white" />.</span>
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="font-bold text-white bg-[#1E3A54] w-6 h-6 flex items-center justify-center rounded-full text-sm shrink-0">2</span>
                            <span className="mt-0.5">Rulla ner i menyn och välj <strong>"Lägg till på hemskärmen"</strong> <PlusSquare className="inline w-5 h-5 mx-1 text-white" />.</span>
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="font-bold text-white bg-[#1E3A54] w-6 h-6 flex items-center justify-center rounded-full text-sm shrink-0">3</span>
                            <span className="mt-0.5">Tryck på <strong>"Lägg till"</strong>. Klart!</span>
                        </li>
                    </ol>
                </div>

                <div className="bg-[#132738] border border-[#1E3A54] p-6 rounded-2xl shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-xl flex items-center gap-3 text-white">
                            <span className="text-2xl">🤖</span> För Android (Chrome)
                        </h3>
                    </div>
                    <ol className="space-y-4 text-muted-foreground text-base">
                        <li className="flex gap-4 items-start">
                            <span className="font-bold text-white bg-[#1E3A54] w-6 h-6 flex items-center justify-center rounded-full text-sm shrink-0">1</span>
                            <span className="mt-0.5">Tryck på de <strong>tre prickarna</strong> <MoreVertical className="inline w-5 h-5 mx-1 text-white" /> uppe i högra hörnet.</span>
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="font-bold text-white bg-[#1E3A54] w-6 h-6 flex items-center justify-center rounded-full text-sm shrink-0">2</span>
                            <span className="mt-0.5">Välj <strong>"Lägg till på startskärmen"</strong> (eller "Installera app") <Smartphone className="inline w-5 h-5 mx-1 text-white" />.</span>
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="font-bold text-white bg-[#1E3A54] w-6 h-6 flex items-center justify-center rounded-full text-sm shrink-0">3</span>
                            <span className="mt-0.5">Tryck på <strong>"Lägg till"</strong>. Klart!</span>
                        </li>
                    </ol>
                    <div className="mt-6 border-t border-[#1E3A54] pt-6 flex justify-center">
                        <InstallPwaButton />
                    </div>
                </div>

                <div className="text-sm text-center bg-primary/10 rounded-xl p-4 border border-primary/20 text-white font-medium">
                    💡 <strong>Tips:</strong> Logga in direkt när du öppnar appen från hemskärmen första gången, så är du alltid smidigt inloggad och redo!
                </div>
            </div>
        </div>
    );
}
