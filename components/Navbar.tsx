'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function Navbar() {
    const pathname = usePathname();
    const { user, profile } = useAuth();
    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');

    if (isAuthPage) return null;

    const initial = profile?.displayName ? profile.displayName[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : 'U');

    return (
        <nav className="bg-[#0B1E2D] sticky top-0 z-50 pt-safe">
            <div className="container flex h-16 max-w-5xl mx-auto items-center justify-between px-4">
                <div className="flex items-center gap-4 md:gap-8 overflow-hidden">
                    <Link href="/" className="font-serif font-bold text-2xl md:text-3xl text-white tracking-tight flex-shrink-0">
                        Bertlids
                    </Link>
                    {user && (
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                            <Link href="/dashboard" className="text-[10px] md:text-xs tracking-widest uppercase font-bold text-primary whitespace-nowrap">
                                Hem
                            </Link>
                            <Link href="/tips" className="text-[10px] md:text-xs tracking-widest uppercase font-bold text-muted-foreground hover:text-white transition-colors whitespace-nowrap">
                                Tips
                            </Link>
                            <Link href="/equipment" className="text-[10px] md:text-xs tracking-widest uppercase font-bold text-muted-foreground hover:text-white transition-colors whitespace-nowrap">
                                Utrustning
                            </Link>
                        </div>
                    )}
                </div>
                <div className="flex items-center pl-2 flex-shrink-0">
                    {user ? (
                        <Link href="/profile">
                            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary flex items-center justify-center text-[#0B1E2D] font-bold shadow-sm hover:scale-105 transition-transform text-sm">
                                {initial}
                            </div>
                        </Link>
                    ) : (
                        <div className="flex items-center space-x-3">
                            <Link href="/login" className="text-xs md:text-sm font-medium text-white hover:text-primary transition-colors hidden sm:block">
                                Logga in
                            </Link>
                            <Link href="/register" className="bg-primary hover:bg-primary/90 text-[#0B1E2D] px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-colors">
                                Kom igång
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
