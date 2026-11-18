'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button, Input, Card } from '@/components/ui/primitives';
import Link from 'next/link';

export default function ResetPasswordPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        const clean = email.trim();
        if (!clean) return;
        setLoading(true);
        setError('');
        try {
            auth.languageCode = 'sv';
            await sendPasswordResetEmail(auth, clean);
            setSent(true);
        } catch (err: any) {
            if (err?.code === 'auth/user-not-found') {
                setError('Vi hittade inget konto med den e-postadressen.');
            } else {
                setError('Kunde inte skicka återställningslänken. Kontrollera e-postadressen och försök igen.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-8 glass-card">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold mb-2">
                        {sent ? 'Återställningslänk skickad!' : 'Glömt ditt lösenord?'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {sent
                            ? `Vi har skickat ett mejl till ${email.trim()} med en länk för att välja ett nytt lösenord.`
                            : 'Fyll i e-postadressen du registrerade dig med i Bertlids Fiskeapp så skickar vi en återställningslänk direkt.'}
                    </p>
                </div>

                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
                        {error}
                    </div>
                )}

                {!sent ? (
                    <form onSubmit={handleReset} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">E-postadress</label>
                            <Input
                                type="email"
                                placeholder="din.epost@exempel.se"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Skickar...' : 'Skicka nytt lösenord'}
                        </Button>
                    </form>
                ) : (
                    <div className="space-y-3 text-sm text-muted-foreground">
                        <p>1. Öppna mejlet (kolla även Skräppost om det dröjer en minut) och välj ett nytt lösenord.</p>
                        <p>2. Öppna sedan Bertlids Fiskeapp på din iPhone eller Android och logga in med ditt nya lösenord!</p>
                    </div>
                )}

                <div className="mt-6 text-center text-sm">
                    <Link href="/login" className="text-primary hover:underline">
                        ← Tillbaka till inloggningen
                    </Link>
                </div>
            </Card>
        </div>
    );
}
