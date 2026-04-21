'use client';

import { useState, useEffect } from "react";
import { X, Download, Share, PlusSquare, MoreVertical, Smartphone } from "lucide-react";

export function InstallAppModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-border flex flex-col max-h-[90vh]" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Download className="w-5 h-5 text-primary" />
                        Ladda ner Appen
                    </h2>
                    <button onClick={onClose} className="p-2 bg-background rounded-full hover:bg-muted text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 text-sm">
                    <p className="text-muted-foreground leading-relaxed">
                        Eftersom Fiskeappen är en modern webbapp slipper du App Store eller Google Play. Du lägger enkelt till den direkt på din hemskärm!
                    </p>

                    <div className="bg-background/50 border border-border p-4 rounded-xl">
                        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                            <span className="text-xl">🍎</span> För iPhone (Safari)
                        </h3>
                        <ol className="space-y-3 text-muted-foreground">
                            <li className="flex gap-3">
                                <span className="font-bold text-foreground">1.</span>
                                <span>Längst ner på Safari-skärmen, tryck på <strong>Dela-ikonen</strong> <Share className="inline w-4 h-4 mx-1" />.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="font-bold text-foreground">2.</span>
                                <span>Rulla ner i menyn och välj <strong>"Lägg till på hemskärmen"</strong> <PlusSquare className="inline w-4 h-4 mx-1" />.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="font-bold text-foreground">3.</span>
                                <span>Tryck på <strong>"Lägg till"</strong>. Klart!</span>
                            </li>
                        </ol>
                    </div>

                    <div className="bg-background/50 border border-border p-4 rounded-xl">
                        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                            <span className="text-xl">🤖</span> För Android (Chrome)
                        </h3>
                        <ol className="space-y-3 text-muted-foreground">
                            <li className="flex gap-3 items-start">
                                <span className="font-bold text-foreground mt-0.5">1.</span>
                                <span>Tryck på de <strong>tre prickarna</strong> <MoreVertical className="inline w-4 h-4 mx-1" /> uppe i högra hörnet.</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <span className="font-bold text-foreground mt-0.5">2.</span>
                                <span>Välj <strong>"Lägg till på startskärmen"</strong> (eller "Installera app") <Smartphone className="inline w-4 h-4 mx-1" />.</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <span className="font-bold text-foreground mt-0.5">3.</span>
                                <span>Tryck på <strong>"Lägg till"</strong>. Klart!</span>
                            </li>
                        </ol>
                    </div>

                    <div className="text-xs text-muted-foreground text-center bg-primary/10 rounded-lg p-3 text-primary-foreground/90">
                        Tips: Logga in direkt när du öppnar appen från hemskärmen första gången, så är du alltid smidigt inloggad och redo!
                    </div>
                </div>
            </div>
        </div>
    );
}
