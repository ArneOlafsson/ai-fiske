'use client';

import { useAuth } from "@/components/AuthProvider";
import { Button, Card } from "@/components/ui/primitives";
import Link from "next/link";
import { Camera, MapPin, MessageCircle, Users, Crown, Zap, Lightbulb, Anchor, Sparkles, ArrowRight, Cloud, ArrowUpRight, Wind, Droplets, Download } from "lucide-react";

export default function Dashboard() {
    const { profile, loading } = useAuth();

    if (loading) return null;

    const isPremium = profile?.isPremium;
    const userName = profile?.displayName || 'Test';

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <header className="space-y-2">
                <h2 className="text-primary font-bold text-xs tracking-widest uppercase">Välkommen tillbaka</h2>
                <h1 className="text-4xl md:text-5xl font-serif text-white">Hej, {userName}.</h1>
                <p className="text-muted-foreground text-lg">Vad vill du göra idag?</p>
            </header>

            {!isPremium ? (
                <Link href="/profile" className="block">
                    <div className="bg-gradient-to-r from-[#3C8D71] to-[#5EC4A1] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between shadow-lg shadow-black/20 hover:scale-[1.02] transition-transform gap-4">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-[#0B1E2D]" />
                            <div>
                                <h3 className="text-[#0B1E2D] font-bold text-xs tracking-widest uppercase opacity-90">Uppgradera</h3>
                                <p className="text-white font-bold text-xl">Lås upp Premium</p>
                            </div>
                        </div>
                        <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm text-sm font-bold text-white w-fit">
                            299 kr
                        </div>
                    </div>
                </Link>
            ) : (
                <div className="bg-[#132738] rounded-2xl p-5 flex items-center justify-between border-l-4 border-primary shadow-lg shadow-black/20">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-6 h-6 text-primary" />
                        <div>
                            <h3 className="text-primary font-bold text-xs tracking-widest uppercase">Premium Aktivt</h3>
                            <p className="text-white font-bold text-xl">Njut av full tillgång</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <h2 className="text-muted-foreground font-bold text-xs tracking-widest uppercase mb-4">Verktyg</h2>
                
                <FeatureCard 
                    href="/install"
                    title="Ladda ner appen"
                    desc="Installera fiskeappen direkt på din hemskärm för enklare åtkomst."
                    badge="Guide & Installation"
                    icon={<Download className="w-5 h-5 text-white/70" />}
                    accentColor="#ef4444" 
                />

                <FeatureCard 
                    href="/community"
                    title="Community & Fångst"
                    desc="Se andras fångster och dela dina egna."
                    badge="Dela & Utforska"
                    icon={<Users className="w-5 h-5 text-white/70" />}
                    accentColor="#E28743" 
                />

                <FeatureCard 
                    href="/tips"
                    title="Tips & Trix"
                    desc="Experttips från Johan Bertlid."
                    badge="Kunskapsbank"
                    icon={<Lightbulb className="w-5 h-5 text-white/70" />}
                    accentColor="#eab308" 
                />

                <FeatureCard 
                    href="/equipment"
                    title="Bertlids utrustning"
                    desc="Rekommendationer och tips från Johan Bertlid."
                    badge="Utrustning"
                    icon={<Anchor className="w-5 h-5 text-white/70" />}
                    accentColor="#06b6d4" 
                />

                <FeatureCard 
                    href="/weather"
                    title="Väder & Lufttryck"
                    desc="Lokala prognoser optimerade för fiske."
                    badge="Prognos"
                    icon={<Cloud className="w-5 h-5 text-white/70" />}
                    accentColor="#0ea5e9"
                />

                <FeatureCard 
                    href="/identify"
                    title="Identifiera Fångst"
                    desc="Ta en bild — få art, recept och tips direkt."
                    badge="AI-Identifiering"
                    icon={<Camera className="w-5 h-5 text-white/70" />}
                    accentColor="#5EC4A1" 
                />

                <FeatureCard 
                    href="/spots"
                    title="Hitta Vatten"
                    desc="Utforska hemliga smultronställen baserat på art."
                    badge="GPS & Karta"
                    icon={<MapPin className="w-5 h-5 text-white/70" />}
                    accentColor="#3b82f6" 
                />

                <FeatureCard 
                    href="/chat"
                    title="AI-Assistent"
                    desc="Ställ frågor om utrustning och metoder."
                    badge="Frågor & Svar"
                    icon={<MessageCircle className="w-5 h-5 text-white/70" />}
                    accentColor="#8b5cf6" 
                />
            </div>
            
             <div className="mt-8 pt-6 border-t border-[#1E3A54]">
                <h2 className="text-muted-foreground font-bold text-xs tracking-widest uppercase mb-4">Erbjudanden</h2>
                <SponsorCard
                    title="Animal Deli"
                    desc="Naturligt hundgodis för din bästa fiskekompis. Perfekt i båten! Kod BERTLID1 ger 50%."
                    image="/ads/animal-deli.png"
                    cta="Gå till butik"
                    href="https://animaldeli.com/"
                />
             </div>
        </div>
    );
}

function FeatureCard({ href, title, desc, icon, badge, accentColor }: any) {
    return (
        <Link href={href} className="block group">
            <div 
                className="bg-[#132738] rounded-2xl p-5 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:bg-[#1a334a] flex items-center justify-between border-l-[6px]"
                style={{ borderLeftColor: accentColor }}
            >
                <div className="flex gap-4 items-start w-full">
                    <div className="bg-[#1E3A54] p-3 rounded-xl shrink-0 mt-1">
                        {icon}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="text-white font-bold text-lg">{title}</h3>
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-3 pr-4">{desc}</p>
                        <div 
                            className="text-[10px] uppercase tracking-wider font-bold inline-block px-2 py-1 rounded bg-[#1E3A54]/50"
                            style={{ color: accentColor }}
                        >
                            {badge}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

function SponsorCard({ title, desc, image, cta, href }: any) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block group">
            <div className="bg-[#132738] rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:bg-[#1a334a] border border-[#1E3A54]">
                <div className="absolute top-4 right-4 px-2 py-1 bg-[#1E3A54] rounded text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Sponsrat
                </div>

                <div className="flex flex-col h-full justify-between">
                    <div>
                        <div className="mb-6 h-10 flex items-center bg-white/10 rounded p-2 w-fit">
                            <img
                                src={image}
                                alt={title}
                                className="h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity filter brightness-0 invert"
                                onError={(e: any) => {
                                    e.target.style.display = 'none';
                                    const fallback = document.createElement('div');
                                    fallback.className = "font-bold text-xl text-primary";
                                    fallback.innerText = title;
                                    e.target.parentElement.appendChild(fallback);
                                }}
                            />
                        </div>
                        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{desc}</p>
                    </div>

                    <Button variant="outline" size="sm" className="w-full mt-2 border-primary/50 text-white hover:bg-primary hover:border-primary hover:text-[#0B1E2D] bg-transparent transition-all">
                        {cta}
                    </Button>
                </div>
            </div>
        </a>
    );
}
