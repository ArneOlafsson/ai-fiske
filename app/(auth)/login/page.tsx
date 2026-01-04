'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button, Input, Card } from '@/components/ui/primitives';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
    const { devLogin } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/dashboard'); // Redirect to dashboard
        } catch (err: any) {
            setError('Kunde inte logga in. Kontrollera dina uppgifter.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);

            // Check if user document exists
            const userRef = doc(db, 'users', result.user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                try {
                    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 5000));
                    await Promise.race([
                        setDoc(userRef, {
                            uid: result.user.uid,
                            email: result.user.email,
                            displayName: result.user.displayName,
                            photoURL: result.user.photoURL,
                            createdAt: serverTimestamp(),
                            isPremium: false,
                            premiumType: 'none',
                            aiQuotaTotal: 500,
                            aiQuotaUsed: 0,
                            role: 'user',
                            banned: false
                        }),
                        timeout
                    ]);
                } catch (e) {
                    console.error("Failed to create profile on Google login (timeout or error):", e);
                    // Continue to dashboard anyway
                }
            }

            router.push('/dashboard');
        } catch (err) {
            setError('Google-inloggning misslyckades.');
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md p-8 glass-card">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Välkommen tillbaka</h1>
                    <p className="text-muted-foreground">Logga in på AI Fiskeassistent</p>
                </div>

                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Email</label>
                        <Input
                            type="email"
                            placeholder="exempel@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Lösenord</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Loggar in...' : 'Logga in'}
                    </Button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-muted"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Eller fortsätt med</span>
                    </div>
                </div>

                <Button variant="outline" type="button" className="w-full" onClick={handleGoogleLogin}>
                    Google
                </Button>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-muted"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">DEMO LÄGE</span>
                    </div>
                </div>

                <Button
                    variant="secondary"
                    type="button"
                    className="w-full border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                    onClick={() => devLogin?.()}
                >
                    Dev Login (Bypass Auth)
                </Button>

                <div className="mt-6 text-center text-sm">
                    Har du inget konto?{' '}
                    <Link href="/register" className="text-primary hover:underline">
                        Registrera dig
                    </Link>
                </div>
            </Card>
        </div>
    );
}
