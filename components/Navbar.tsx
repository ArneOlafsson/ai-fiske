'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/primitives';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/components/AuthProvider';

export default function Navbar() {
    const pathname = usePathname();
    const { user } = useAuth();
    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');

    if (isAuthPage) return null;

    return (
        <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
                <Link href="/" className="flex items-center space-x-2 font-bold text-xl text-primary tracking-tight">
                    <span>🐟 AI Fiskeassistent</span>
                </Link>
                <div className="flex items-center space-x-4">
                    {user ? (
                        <>
                            <Link href="/dashboard">
                                <Button variant="ghost" size="sm">Hem</Button>
                            </Link>
                            <Link href="/profile">
                                <Button variant="default" size="sm">Min Profil</Button>
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost" size="sm">Logga in</Button>
                            </Link>
                            <Link href="/register">
                                <Button size="sm">Kom igång</Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
