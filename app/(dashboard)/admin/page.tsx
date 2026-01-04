'use client';

import { useAuth } from '@/components/AuthProvider';
import { Button, Card, Input } from '@/components/ui/primitives';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';
import { Shield, Ban, CheckCircle, Search } from 'lucide-react';

export default function AdminPage() {
    const { profile, loading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [stats, setStats] = useState({ totalUsers: 0, premiumUsers: 0 });

    useEffect(() => {
        if (!loading && profile?.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [profile, loading, router]);

    const loadUsers = async () => {
        setLoadingUsers(true);
        // Fetch all users (careful in prod)
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const userList = snapshot.docs.map(d => d.data() as UserProfile);
        setUsers(userList);

        setStats({
            totalUsers: userList.length,
            premiumUsers: userList.filter(u => u.isPremium).length
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
        loadUsers(); // Refresh
    };

    if (loading || profile?.role !== 'admin') return null;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Shield className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold">Adminpanel</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground">Totalt antal användare</h3>
                    <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </Card>
                <Card className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground">Premium Users</h3>
                    <p className="text-3xl font-bold text-accent">{stats.premiumUsers}</p>
                </Card>
                <Card className="p-6">
                    <Button onClick={loadUsers} variant="outline" className="w-full">
                        Uppdatera lista
                    </Button>
                </Card>
            </div>

            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Användare</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-muted-foreground bg-secondary/50">
                            <tr>
                                <th className="p-3 rounded-tl-lg">Namn</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Status</th>
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
                                    <td className="p-3">{u.aiQuotaUsed} / {u.aiQuotaTotal}</td>
                                    <td className="p-3">
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
