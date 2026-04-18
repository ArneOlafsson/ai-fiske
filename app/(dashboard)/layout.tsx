'use client';

import { useAuth } from "@/components/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Home, Map as MapIcon, List, User, Crown } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // Removed auth check to allow Guest Access
    /*
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);
    */

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // if (!user) return null; // Allow rendering for guests

    const userEmail = (user?.email || profile?.email || '').toLowerCase().trim();
    const isPremium = profile?.isPremium || userEmail === 'arvid.bertlid@icloud.com';
    const isAdmin = profile?.role === 'admin' || 
                    userEmail === 'johan@animaldeli.com' || 
                    userEmail === 'arne@olafsson.se';
    
    // Paths that are strictly allowed for free users
    const isAllowedFreePath = (path: string) => {
        if (path === '/dashboard' || path === '/profile') return true;
        if (path === '/community') return true;
        return false;
    };

    // Block logic: if user is logged in, NOT premium, NOT admin, and path is NOT in allowed list
    if (user && !isPremium && !isAdmin && pathname && !isAllowedFreePath(pathname)) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-5xl md:pb-8 pb-24 h-[calc(100vh-100px)] flex flex-col items-center justify-center">
                <Crown className="w-20 h-20 text-[#5EC4A1] mx-auto mb-6 opacity-90" />
                <h1 className="text-3xl md:text-4xl font-serif text-white font-bold mb-4 text-center">Premium Krävs</h1>
                <p className="text-muted-foreground text-center mb-8 max-w-md mx-auto text-lg">
                    Lås upp AI-Fiske för att få tillgång till AI-Identifiering, Smultronställen, Community, Experttips och Chatten.
                </p>
                <Link href="/profile">
                    <Button size="lg" className="bg-[#5EC4A1] text-[#0B1E2D] hover:bg-[#4eb390] w-full max-w-xs font-bold text-lg shadow-lg">
                        Lås upp för 299 kr
                    </Button>
                </Link>

                {/* Bottom Navigation for Mobile (so they can navigate away) */}
                <nav className="fixed bottom-0 left-0 right-0 bg-[#0B1E2D]/95 backdrop-blur-md border-t border-[#1E3A54] z-50 px-6 py-3 flex justify-between items-center md:hidden pb-safe">
                    <Link href="/dashboard" className="flex flex-col items-center text-muted-foreground hover:text-primary group transition-colors">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full group-hover:bg-primary/10 transition-colors">
                            <Home className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-medium tracking-wider mt-1">Hem</span>
                    </Link>
                    <Link href="/profile" className="flex flex-col items-center text-primary group">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full group-hover:bg-primary/10">
                            <User className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-medium tracking-wider mt-1">Profil</span>
                    </Link>
                </nav>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl md:pb-8 pb-24">
            {children}

            {/* Bottom Navigation for Mobile */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[#0B1E2D]/95 backdrop-blur-md border-t border-[#1E3A54] z-50 px-6 py-3 flex justify-between items-center md:hidden pb-safe">
                <Link href="/dashboard" className="flex flex-col items-center text-primary group">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full group-hover:bg-primary/10 transition-colors">
                        <Home className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium tracking-wider mt-1">Hem</span>
                </Link>
                <Link href="/spots" className="flex flex-col items-center text-muted-foreground hover:text-primary group transition-colors">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full group-hover:bg-primary/10">
                        <MapIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium tracking-wider mt-1">Karta</span>
                </Link>

                <Link href="/profile" className="flex flex-col items-center text-muted-foreground hover:text-primary group transition-colors">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full group-hover:bg-primary/10">
                        <User className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium tracking-wider mt-1">Profil</span>
                </Link>
            </nav>
        </div>
    );
}
