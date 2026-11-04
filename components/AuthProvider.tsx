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

function evaluate2027Membership(raw: any): UserProfile {
    if (!raw || !raw.isPremium) return raw as UserProfile;
    if (raw.role === 'admin' || raw.premiumType === 'lifetime') return raw as UserProfile;

    const nowMs = Date.now();
    const q4Start2026Ms = new Date('2026-10-01T00:00:00Z').getTime();
    const endOf2026Ms = new Date('2026-12-31T23:59:59Z').getTime();

    const explicitExpiresMs = raw.premiumExpiresAt?.toDate
        ? raw.premiumExpiresAt.toDate().getTime()
        : raw.premiumExpiresAt?.seconds
            ? raw.premiumExpiresAt.seconds * 1000
            : raw.premiumExpiresAt
                ? new Date(raw.premiumExpiresAt).getTime()
                : null;

    const paidSinceMs = raw.premiumSince?.toDate
        ? raw.premiumSince.toDate().getTime()
        : raw.premiumSince?.seconds
            ? raw.premiumSince.seconds * 1000
            : raw.createdAt?.seconds
                ? raw.createdAt.seconds * 1000
                : 0;

    let effectiveExpiresMs: number;
    if (explicitExpiresMs) {
        effectiveExpiresMs = explicitExpiresMs;
    } else if (paidSinceMs >= q4Start2026Ms) {
        const d = new Date(paidSinceMs);
        d.setFullYear(d.getFullYear() + 1);
        effectiveExpiresMs = d.getTime();
    } else {
        effectiveExpiresMs = endOf2026Ms;
    }

    if (nowMs > effectiveExpiresMs) {
        return {
            ...raw,
            isPremium: false,
            needs2027Renewal: true,
        } as any;
    }

    return raw as UserProfile;
}

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
        const params = new URLSearchParams(window.location.search);
        if (params.get('reset')) {
            localStorage.removeItem('dev_mode_user');
            window.location.href = '/login';
            return;
        }

        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                const unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        setProfile(evaluate2027Membership(docSnap.data()));
                    } else {
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
