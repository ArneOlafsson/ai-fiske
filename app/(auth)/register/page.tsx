'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Button, Input, Card } from '@/components/ui/primitives';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const createUserProfile = async (user: any) => {
        try {
            const userRef = doc(db, 'users', user.uid);

            // Race setDoc against a timeout to prevent hanging
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 10000));

            await Promise.race([
                setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || email.split('@')[0],
                    photoURL: user.photoURL,
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

        } catch (error: any) {
            console.error("Error creating user profile:", error);
            // Proceed without throwing to allow dashboard access
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            await createUserProfile(userCredential.user);

            router.push('/dashboard');
        } catch (err: any) {
            console.error("Registration error:", err);
            setError('Registrering misslyckades. ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleRegister = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);

            const userRef = doc(db, 'users', result.user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
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
                });
            }

            router.push('/dashboard');
        } catch (err) {
            setError('Google-registrering misslyckades.');
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md p-8 glass-card">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Skapa konto</h1>
                    <p className="text-muted-foreground">Börja din fiskeresa idag</p>
                </div>

                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Email</label>
                        <Input
                            type="email"
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
                        {loading ? 'Skapar konto...' : 'Registrera'}
                    </Button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-muted"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Eller</span>
                    </div>
                </div>

                <Button variant="outline" type="button" className="w-full" onClick={handleGoogleRegister}>
                    Google
                </Button>

                <div className="mt-6 text-center text-sm">
                    Har du redan ett konto?{' '}
                    <Link href="/login" className="text-primary hover:underline">
                        Logga in
                    </Link>
                </div>
            </Card>
        </div>
    );
}
