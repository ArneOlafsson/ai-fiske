'use client';

import { Button, Card } from "@/components/ui/primitives";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, MapPin, ChefHat, MessageCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  if (loading) return null; // Prevent flash of content

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 md:pt-32">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10 -z-10" />
        <div className="container px-4 mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent"
          >
            Din Fiskeexpert i Fickan
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Ladda upp en bild och få direkt svar på art, recept och bästa fiskeplatserna.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/register">
              <Button size="lg" className="rounded-full text-lg px-8 py-6 shadow-lg shadow-primary/25">
                Kom igång nu
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="rounded-full text-lg px-8 py-6">
                Logga in
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-secondary/20">
        <div className="container px-4 mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Camera className="w-8 h-8 text-primary" />}
            title="AI-Identifiering"
            desc="Fota din fångst och få artbestämning på sekunder."
          />
          <FeatureCard
            icon={<MapPin className="w-8 h-8 text-accent" />}
            title="Fiskeplatser"
            desc="Hitta dolda smultronställen baserat på art och säsong."
          />
          <FeatureCard
            icon={<ChefHat className="w-8 h-8 text-primary" />}
            title="Recept & Tips"
            desc="Få skräddarsydda recept för just din fångst."
          />
          <FeatureCard
            icon={<MessageCircle className="w-8 h-8 text-accent" />}
            title="AI-Chatt"
            desc="Fråga om utrustning, tekniker och väder."
          />
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 relative">
        <div className="container px-4 mx-auto max-w-4xl">
          <Card className="glass-card overflow-hidden border-primary/20 p-8 md:p-12 text-center relative">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-bold rounded-bl-xl">
              POPULÄR
            </div>
            <h2 className="text-3xl font-bold mb-4">Engångsbetalning</h2>
            <div className="text-6xl font-bold text-primary mb-6">
              99 kr <span className="text-xl text-muted-foreground font-normal">/ livstid</span>
            </div>
            <ul className="text-left max-w-md mx-auto space-y-4 mb-8 text-lg text-muted-foreground">
              <li className="flex items-center gap-3">
                <span className="text-green-500">✓</span> 500 AI-identifieringar
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-500">✓</span> Obegränsad tillgång till community
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-500">✓</span> Exklusiva recept och platstips
              </li>
              <li className="flex items-center gap-3">
                <span className="text-green-500">✓</span> Inga månadskostnader
              </li>
            </ul>
            <Link href="/register">
              <Button size="lg" className="w-full md:w-auto min-w-[200px] text-lg">
                Skaffa Premium Nu
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-secondary/10">
        <div className="container px-4 mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold mb-10 text-center">Vanliga frågor</h2>
          <div className="space-y-6">
            <FaqItem q="Vad händer när mina 500 identifieringar tar slut?" a="Du kan fortfarande använda appens andra funktioner, men för fler identifieringar kan du köpa tilläggspaket (kommer snart)." />
            <FaqItem q="Fungerar appen på alla telefoner?" a="Ja, AI Fiskeassistent är en webbapp (PWA) som fungerar direkt i webbläsaren på både iPhone och Android." />
            <FaqItem q="Är min data säker?" a="Absolut. Vi följer GDPR och dina bilder används endast för analys." />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <Card className="p-6 border-border/50 hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm">
      <div className="mb-4 p-3 bg-background rounded-full w-fit shadow-inner border border-border/50">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{desc}</p>
    </Card>
  );
}

function FaqItem({ q, a }: { q: string, a: string }) {
  return (
    <div className="border-b border-border/50 pb-4">
      <h4 className="font-semibold text-lg mb-2">{q}</h4>
      <p className="text-muted-foreground">{a}</p>
    </div>
  );
}
