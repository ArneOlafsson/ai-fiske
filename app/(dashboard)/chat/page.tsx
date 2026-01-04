'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Input, Card } from '@/components/ui/primitives';
import { Send, User as UserIcon, Bot, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChatMessage } from '@/lib/types';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';

const SUGGESTIONS = [
    "Bästa bete för gädda?",
    "Hur rensar jag abborre?",
    "När fiskar man gös bäst?"
];

export default function ChatPage() {
    const { user, profile } = useAuth();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        // Listen to messages
        const q = query(
            collection(db, 'chats', user.uid, 'messages'),
            orderBy('createdAt', 'asc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ChatMessage[];
            setMessages(msgs);
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });

        return () => unsubscribe();
    }, [user]);

    const handleSend = async (text: string = input) => {
        if (!text.trim() || !user) return;
        if (!profile?.isPremium) {
            router.push('/profile');
            return;
        }
        if (profile.aiQuotaUsed >= profile.aiQuotaTotal) {
            alert("Din AI-kvot är slut.");
            return;
        }

        const userMsg = text.trim();
        setInput('');
        setLoading(true);

        try {
            // 1. Add User Message to Firestore
            await addDoc(collection(db, 'chats', user.uid, 'messages'), {
                role: 'user',
                text: userMsg,
                createdAt: serverTimestamp()
            });

            // Optimistic Quota Update
            updateDoc(doc(db, 'users', user.uid), { aiQuotaUsed: increment(1) });

            // 2. Call API
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, history: messages.slice(-5) })
            });
            const data = await res.json();

            // 3. Add AI Reply to Firestore
            // Ideally done by backend function, but client for MVP
            await addDoc(collection(db, 'chats', user.uid, 'messages'), {
                role: 'assistant',
                text: data.text,
                createdAt: serverTimestamp()
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
            <div className="text-center md:text-left mb-4">
                <h1 className="text-3xl font-bold">Fiskeassistenten</h1>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden mb-4 border-primary/20 bg-background/50 backdrop-blur-lg">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground mt-10">
                            <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Ställ en fråga för att komma igång!</p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={clsx("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                            <div className={clsx(
                                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                            )}>
                                {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={clsx(
                                "p-3 rounded-2xl max-w-[80%] text-sm",
                                msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm"
                            )}>
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                                <Bot size={16} />
                            </div>
                            <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>

                {/* Suggestions */}
                {messages.length === 0 && (
                    <div className="px-4 pb-2 flex gap-2 flex-wrap">
                        {SUGGESTIONS.map(s => (
                            <button
                                key={s}
                                onClick={() => handleSend(s)}
                                className="text-xs bg-secondary hover:bg-secondary/80 px-3 py-1 rounded-full transition-colors"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                <div className="p-4 border-t border-border bg-card">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        className="flex gap-2"
                    >
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Skriv din fiskefråga..."
                            className="flex-1"
                            disabled={loading}
                        />
                        <Button type="submit" size="sm" className="w-9 h-9 px-0" disabled={loading || !input.trim()}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
}
