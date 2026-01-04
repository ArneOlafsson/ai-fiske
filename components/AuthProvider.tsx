'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    devLogin?: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const devLoginInternal = (shouldRedirect: boolean) => {
        const mockUser: any = {
            uid: 'dev-user-123',
            email: 'dev@example.com',
            displayName: 'Dev User',
            photoURL: null,
            emailVerified: true
        };

        const mockProfile: UserProfile = {
            uid: 'dev-user-123',
            email: 'dev@example.com',
            displayName: 'Dev User',
            photoURL: null,
            createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
            isPremium: true,
            premiumType: 'lifetime',
            aiQuotaTotal: 500,
            aiQuotaUsed: 0,
            role: 'user',
            banned: false
        };

        setUser(mockUser);
        setProfile(mockProfile);
        setLoading(false);
        localStorage.setItem('dev_mode_user', 'true');

        if (shouldRedirect) {
            router.push('/dashboard');
        }
    };

    const devLogin = () => devLoginInternal(true);

    useEffect(() => {
        if (typeof window !== 'undefined' && localStorage.getItem('dev_mode_user') === 'true') {
            devLoginInternal(false);
            return;
        }

        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // Subscribe to user profile
                const unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
                    if (doc.exists()) {
                        setProfile(doc.data() as UserProfile);
                    } else {
                        // New Google user might not have doc yet if register page didn't catch it
                        // Could create here if needed
                        setProfile(null);
                    }
                    setLoading(false);
                });
                return () => unsubProfile();
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, loading, devLogin } as any}>
            {children}
        </AuthContext.Provider>
    );
}
