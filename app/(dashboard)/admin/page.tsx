'use client';

import { useAuth } from '@/components/AuthProvider';
import { Button, Card, Input } from '@/components/ui/primitives';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';
import { Shield, Ban, CheckCircle, Download, Calendar } from 'lucide-react';

export default function AdminPage() {
    const { profile, loading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        premiumUsers: 0,
        q1ToQ3_2026Users: 0,
        q4_2026Users: 0,
    });

    const isQ4_2026OrLater = (u: any): boolean => {
        const q4Start = new Date('2026-10-01T00:00:00Z').getTime();
        const sinceMs = u.premiumSince?.seconds
            ? u.premiumSince.seconds * 1000
            : u.createdAt?.seconds
                ? u.createdAt.seconds * 1000
                : 0;
        return sinceMs >= q4Start;
    };

    const getRenewalLabel = (u: any): string => {
        if (!u.isPremium) return 'Gratis (Påminns 1 jan 2027)';
        if (u.premiumExpiresAt?.seconds) {
            const d = new Date(u.premiumExpiresAt.seconds * 1000).toISOString().split('T')[0];
            return `12 mån rullande (Utgår ${d})`;
        }
        if (isQ4_2026OrLater(u)) {
            const sinceMs = (u.premiumSince?.seconds || u.createdAt?.seconds) * 1000;
            const exp = new Date(sinceMs);
            exp.setFullYear(exp.getFullYear() + 1);
            return `Q4 2026 – 12 mån (Utgår ${exp.toISOString().split('T')[0]})`;
        }
        return 'Q1–Q3 2026 (Utgår 2026-12-31 → Påminns 1 jan 2027)';
    };

    const exportReminderCsv = (mode: 'q1_q3_paid' | 'all_2026_renewal') => {
        const filtered = users.filter((u: any) => {
            if (!u.email) return false;
            if (mode === 'q1_q3_paid') {
                return u.isPremium && !isQ4_2026OrLater(u);
            }
            return !(u.isPremium && isQ4_2026OrLater(u));
        });

        const rows = [
            ['Namn', 'E-post', 'Nuvarande Status', 'Förnyelsedatum 2027'],
            ...filtered.map((u: any) => [
                (u.displayName || 'Fiskare').replace(/,/g, ' '),
                u.email || '',
                u.isPremium ? 'Betalande Q1-Q3 2026' : 'Registrerad Gratis 2026',
                '2027-01-01',
            ]),
        ];
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(r => r.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `paminnelse_2027_${mode}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        if (!loading && profile?.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [profile, loading, router]);

    const loadUsers = async () => {
        setLoadingUsers(true);
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const userList = snapshot.docs.map(d => d.data() as UserProfile);
        setUsers(userList);

        const prem = userList.filter(u => u.isPremium);
        const q4 = prem.filter(u => isQ4_2026OrLater(u));
        const q1q3 = prem.filter(u => !isQ4_2026OrLater(u));

        setStats({
            totalUsers: userList.length,
            premiumUsers: prem.length,
            q1ToQ3_2026Users: q1q3.length,
            q4_2026Users: q4.length,
        });
        setLoadingUsers(false);
    };

    useEffect(() => {
        if (profile?.role === 'admin') {
            loadUsers();
        }
    }, [profile]);

    const toggleBan = async (uid: string, currentStatus: boolean) => {
        await updateDoc(doc(db, 'users', uid), { banned: !currentStatus });
        loadUsers();
    };

    const canGrantFreePro = profile?.email?.toLowerCase().trim() === 'arne@olafsson.se';

    const toggleFreePro = async (uid: string, currentIsPremium: boolean) => {
        if (!canGrantFreePro) return;
        if (!currentIsPremium) {
            await updateDoc(doc(db, 'users', uid), {
                isPremium: true,
                premiumType: 'lifetime',
                grantedBy: 'arne@olafsson.se',
                aiQuotaTotal: 9999,
            });
        } else {
            await updateDoc(doc(db, 'users', uid), {
                isPremium: false,
                premiumType: null,
            });
        }
        loadUsers();
    };

    if (loading || profile?.role !== 'admin') return null;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Shield className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold">Adminpanel – Medlemsregelverk 2027</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground">Totalt registrerade</h3>
                    <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </Card>
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground">Betalande Q1–Q3 2026</h3>
                    <p className="text-3xl font-bold text-amber-500">{stats.q1ToQ3_2026Users}</p>
                    <p className="text-xs text-muted-foreground mt-1">Utgår 31 dec 2026 (Påminns 1 jan 2027)</p>
                </Card>
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground">Betalande Q4 2026 / 2027</h3>
                    <p className="text-3xl font-bold text-green-500">{stats.q4_2026Users}</p>
                    <p className="text-xs text-muted-foreground mt-1">Gäller 12 mån från köpdatum</p>
                </Card>
                <Card className="p-6 flex flex-col justify-between gap-2">
                    <Button onClick={loadUsers} variant="outline" className="w-full">
                        Uppdatera lista
                    </Button>
                    <Button
                        onClick={() => exportReminderCsv('q1_q3_paid')}
                        variant="default"
                        className="w-full text-xs flex items-center gap-1"
                    >
                        <Download size={14} /> CSV: Q1–Q3 Betalande (1 jan)
                    </Button>
                    <Button
                        onClick={() => exportReminderCsv('all_2026_renewal')}
                        variant="secondary"
                        className="w-full text-xs flex items-center gap-1"
                    >
                        <Calendar size={14} /> CSV: Alla för 1 jan-utskick
                    </Button>
                </Card>
            </div>

            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Användare & Förnyelsestatus 2027</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-muted-foreground bg-secondary/50">
                            <tr>
                                <th className="p-3 rounded-tl-lg">Namn</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Regelverk 2027</th>
                                <th className="p-3">Kvot Använd</th>
                                <th className="p-3 rounded-tr-lg">Åtgärd</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.uid} className="border-b border-border hover:bg-secondary/20">
                                    <td className="p-3 font-medium">{u.displayName}</td>
                                    <td className="p-3 text-muted-foreground">{u.email}</td>
                                    <td className="p-3">
                                        {u.isPremium ? (
                                            <span className="text-green-500 font-bold flex items-center gap-1"><CheckCircle size={14} /> Premium</span>
                                        ) : 'Gratis'}
                                    </td>
                                    <td className="p-3 text-xs text-muted-foreground">
                                        {getRenewalLabel(u)}
                                    </td>
                                    <td className="p-3">{u.aiQuotaUsed} / {u.aiQuotaTotal}</td>
                                    <td className="p-3 flex items-center gap-2">
                                        {canGrantFreePro && (
                                            <Button
                                                size="sm"
                                                variant={u.isPremium ? "outline" : "default"}
                                                className={u.isPremium ? "text-amber-500 border-amber-500/40" : "bg-amber-500 hover:bg-amber-600 text-black font-bold"}
                                                onClick={() => toggleFreePro(u.uid, u.isPremium)}
                                            >
                                                {u.isPremium ? "Ta bort PRO" : "👑 Ge Gratis PRO"}
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant={u.banned ? "default" : "secondary"}
                                            className={u.banned ? "bg-red-500 hover:bg-red-600" : "text-destructive hover:bg-destructive/10"}
                                            onClick={() => toggleBan(u.uid, u.banned)}
                                        >
                                            {u.banned ? "Avblockera" : <Ban size={14} className="mr-1" />}
                                            {u.banned ? "" : "Blockera"}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
