'use client';

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Home, Map as MapIcon, List, User } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

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
