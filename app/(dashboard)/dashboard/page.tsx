'use client';

import { useAuth } from "@/components/AuthProvider";
import { Button, Card } from "@/components/ui/primitives";
import Link from "next/link";
import { Camera, MapPin, MessageCircle, Users, Crown, Zap, Lightbulb, Anchor } from "lucide-react";

export default function Dashboard() {
    const { profile, loading } = useAuth();

    if (loading) return null;

    const isPremium = profile?.isPremium;
    const quotaLeft = profile ? (profile.aiQuotaTotal - profile.aiQuotaUsed) : 0;

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Hej, {profile?.displayName || 'Fiskare'}! 👋</h1>
                    <p className="text-muted-foreground">Vad vill du göra idag?</p>
                </div>

                {isPremium ? (
                    <div className="bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        <span className="font-medium">{quotaLeft} identifieringar kvar</span>
                    </div>
                ) : (
                    <Link href="/profile">
                        <Button variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                            <Crown className="w-4 h-4 mr-2" />
                            Lås upp Premium (299 kr)
                        </Button>
                    </Link>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <NavCard
                    href="/identify"
                    title="Identifiera Fångst"
                    desc="Ta en bild och få svar direkt (Art, Recept)"
                    icon={<Camera className="w-8 h-8 text-primary" />}
                    gradient="from-blue-500/20 to-cyan-500/20"
                />
                <NavCard
                    href="/community"
                    title="Community"
                    desc="Se andras fångster och dela dina egna."
                    icon={<Users className="w-8 h-8 text-orange-500" />}
                    gradient="from-orange-500/20 to-red-500/20"
                />
                <NavCard
                    href="/tips"
                    title="Tips & Trix"
                    desc="Experttips från Johan Bertlid."
                    icon={<Lightbulb className="w-8 h-8 text-yellow-500" />}
                    gradient="from-yellow-500/20 to-amber-500/20"
                />
                <NavCard
                    href="/spots"
                    title="Hitta Fiskevatten"
                    desc="Var nappar det? Få tips baserat på art."
                    icon={<MapPin className="w-8 h-8 text-green-500" />}
                    gradient="from-green-500/20 to-emerald-500/20"
                />
                <NavCard
                    href="/chat"
                    title="AI-Assistent"
                    desc="Ställ frågor om utrustning och metoder."
                    icon={<MessageCircle className="w-8 h-8 text-violet-500" />}
                    gradient="from-violet-500/20 to-purple-500/20"
                />
                <NavCard
                    href="/equipment"
                    title="Utrustning & Bete"
                    desc="Rekommendationer och tips från Animal Deli."
                    icon={<Anchor className="w-8 h-8 text-teal-500" />}
                    gradient="from-teal-500/20 to-cyan-500/20"
                />

                <SponsorCard
                    title="Animal Deli"
                    desc="Naturligt hundgodis för din bästa fiskekompis. Perfekt i båten!"
                    image="/ads/animal-deli.png"
                    cta="Gå till butik"
                    href="https://animaldeli.com/"
                />
            </div>

            {!isPremium && (
                <Card className="p-6 border-amber-500/30 bg-amber-500/5">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                <Crown className="w-5 h-5 text-amber-500" />
                                Uppgradera till Premium 2026
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                Få obegränsad tillgång till AI-identifiering, personliga recept och exakta fiskeplatser. Hela 2026 för 299 kr.
                            </p>
                        </div>
                        <Link href="/profile">
                            <Button size="lg" className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white">
                                Köp Årskort
                            </Button>
                        </Link>
                    </div>
                </Card>
            )}
        </div>
    );
}

function NavCard({ href, title, desc, icon, gradient }: any) {
    return (
        <Link href={href} className="block group">
            <Card className={`h-full p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border-border/50 bg-gradient-to-br ${gradient} backdrop-blur-sm`}>
                <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-background/50 rounded-xl rounded-tl-sm shadow-sm group-hover:bg-background transition-colors">
                        {icon}
                    </div>
                    <div className="bg-background/20 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs font-semibold">Gå till ➔</span>
                    </div>
                </div>
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="text-muted-foreground">{desc}</p>
            </Card>
        </Link>
    );
}

function SponsorCard({ title, desc, image, cta, href }: any) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block group">
            <Card className="h-full p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border-primary/20 bg-gradient-to-br from-primary/5 to-transparent backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-primary/10 rounded text-[10px] uppercase font-bold text-primary/60 tracking-wider">
                    Sponsrat
                </div>

                <div className="flex flex-col h-full justify-between">
                    <div>
                        <div className="mb-6 h-12 flex items-center">
                            <img
                                src={image}
                                alt={title}
                                className="h-10 object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                                onError={(e: any) => {
                                    e.target.style.display = 'none';
                                    const fallback = document.createElement('div');
                                    fallback.className = "font-bold text-xl text-primary";
                                    fallback.innerText = title;
                                    e.target.parentElement.appendChild(fallback);
                                }}
                            />
                        </div>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{desc}</p>
                    </div>

                    <Button variant="outline" size="sm" className="w-full mt-2 group-hover:bg-primary group-hover:text-white transition-all">
                        {cta}
                    </Button>
                </div>
            </Card>
        </a>
    );
}
