'use client';

import { useAuth } from '@/components/AuthProvider';
import { Button, Card, Input } from '@/components/ui/primitives';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';
import { Shield, Ban, CheckCircle, Download, Calendar, Search } from 'lucide-react';

const ARNE_EMAILS = new Set(['arne@olafsson.se', 'arne.olafsson@gmail.com']);
const ADMIN_EMAILS = new Set([
    'arne@olafsson.se',
    'arne.olafsson@gmail.com',
    'johan@bertlid.se',
    'johan@animaldeli.com',
]);

export default function AdminPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        premiumUsers: 0,
        q1ToQ3_2026Users: 0,
        q4_2026Users: 0,
    });

    const activeEmail = (user?.email || profile?.email || '').toLowerCase().trim();
    const isAdminAccess = profile?.role === 'admin' || ADMIN_EMAILS.has(activeEmail);
    const canGrantFreePro = ARNE_EMAILS.has(activeEmail);

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
        if (!u.isPremium) return 'Gratis';
        if (u.grantedBy) {
            const expStr = u.premiumExpiresAt?.seconds
                ? new Date(u.premiumExpiresAt.seconds * 1000).toISOString().split('T')[0]
                : '2027-12-31';
            return `Gratis PRO via Admin (t.o.m. ${expStr})`;
        }
        if (u.premiumExpiresAt?.seconds) {
            const d = new Date(u.premiumExpiresAt.seconds * 1000).toISOString().split('T')[0];
            return `Giltigt t.o.m. ${d}`;
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
        if (!loading && !isAdminAccess) {
            router.push('/dashboard');
        }
    }, [isAdminAccess, loading, router]);

    const loadUsers = async () => {
        setLoadingUsers(true);
        const snapshot = await getDocs(collection(db, 'users'));
        const userList = snapshot.docs.map(d => ({ uid: d.id, ...(d.data() as any) } as UserProfile));
        userList.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
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
        if (isAdminAccess) {
            loadUsers();
        }
    }, [isAdminAccess]);

    const toggleBan = async (uid: string, currentStatus: boolean) => {
        await updateDoc(doc(db, 'users', uid), { banned: !currentStatus });
        loadUsers();
    };

    const toggleFreePro = async (uid: string, currentIsPremium: boolean) => {
        if (!canGrantFreePro) return;
        if (!currentIsPremium) {
            await updateDoc(doc(db, 'users', uid), {
                isPremium: true,
                premiumType: 'yearly_2027',
                premiumSource: 'admin',
                grantedBy: 'arne@olafsson.se',
                premiumSince: serverTimestamp(),
                premiumExpiresAt: Timestamp.fromDate(new Date('2027-12-31T23:59:59Z')),
                aiQuotaTotal: 9999,
            });
        } else {
            await updateDoc(doc(db, 'users', uid), {
                isPremium: false,
                premiumType: 'none',
                premiumSource: null,
                grantedBy: null,
                premiumExpiresAt: null,
                aiQuotaTotal: 3,
            });
        }
        loadUsers();
    };

    if (loading || !isAdminAccess) return null;

    const qTrim = searchTerm.trim().toLowerCase();
    const visibleUsers = qTrim
        ? users.filter(
              (u: any) =>
                  (u.email || '').toLowerCase().includes(qTrim) ||
                  (u.displayName || '').toLowerCase().includes(qTrim)
          )
        : users.slice(0, 100);

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
                    <h3 className="text-sm font-medium text-muted-foreground">PRO 2027 / Q4 2026</h3>
                    <p className="text-3xl font-bold text-green-500">{stats.q4_2026Users}</p>
                    <p className="text-xs text-muted-foreground mt-1">Giltigt i 12 mån / hela 2027</p>
                </Card>
                <Card className="p-6 flex flex-col justify-between gap-2">
                    <Button onClick={loadUsers} variant="outline" className="w-full" disabled={loadingUsers}>
                        {loadingUsers ? 'Laddar...' : 'Uppdatera lista'}
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-xl font-bold">Användare &amp; PRO-hantering 2027</h2>
                        <p className="text-xs text-muted-foreground">
                            {qTrim
                                ? `Visar ${visibleUsers.length} träff(ar) för "${searchTerm}"`
                                : `Visar de 100 senaste av ${users.length} användare – sök nedan för att hitta valfri e-post eller namn direkt`}
                        </p>
                    </div>
                    <div className="relative w-full md:w-96">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                        <Input
                            type="text"
                            placeholder="Sök på e-postadress eller namn..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-muted-foreground bg-secondary/50">
                            <tr>
                                <th className="p-3 rounded-tl-lg">Namn</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Giltighet</th>
                                <th className="p-3">Kvot Använd</th>
                                <th className="p-3 rounded-tr-lg">Åtgärd</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleUsers.map((u: any) => (
                                <tr key={u.uid} className="border-b border-border hover:bg-secondary/20">
                                    <td className="p-3 font-medium">{u.displayName}</td>
                                    <td className="p-3 text-muted-foreground">{u.email}</td>
                                    <td className="p-3">
                                        {u.isPremium ? (
                                            <span className="text-green-500 font-bold flex items-center gap-1">
                                                <CheckCircle size={14} /> Bertlid PRO
                                            </span>
                                        ) : (
                                            'Gratis'
                                        )}
                                    </td>
                                    <td className="p-3 text-xs text-muted-foreground">
                                        {getRenewalLabel(u)}
                                    </td>
                                    <td className="p-3">
                                        {u.aiQuotaUsed ?? 0} / {u.aiQuotaTotal ?? 3}
                                    </td>
                                    <td className="p-3 flex items-center gap-2">
                                        {canGrantFreePro && (
                                            <Button
                                                size="sm"
                                                variant={u.isPremium ? 'outline' : 'default'}
                                                className={
                                                    u.isPremium
                                                        ? 'text-amber-500 border-amber-500/40'
                                                        : 'bg-amber-500 hover:bg-amber-600 text-black font-bold'
                                                }
                                                onClick={() => toggleFreePro(u.uid, u.isPremium)}
                                            >
                                                {u.isPremium ? 'Ta bort PRO' : '👑 Ge Gratis PRO 2027'}
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant={u.banned ? 'default' : 'secondary'}
                                            className={
                                                u.banned
                                                    ? 'bg-red-500 hover:bg-red-600'
                                                    : 'text-destructive hover:bg-destructive/10'
                                            }
                                            onClick={() => toggleBan(u.uid, u.banned)}
                                        >
                                            {u.banned ? 'Avblockera' : <Ban size={14} className="mr-1" />}
                                            {u.banned ? '' : 'Blockera'}
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
