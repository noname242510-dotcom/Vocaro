'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { collection, getDocs, doc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Zap, Layers, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Subject, Stack } from '@/lib/types';

export default function AllStacksPage() {
    const { firestore, user } = useFirebase();
    const [data, setData] = useState<{ subject: Subject; stacks: Stack[] }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!firestore || !user) return;

            try {
                const subjectsRef = collection(firestore, 'users', user.uid, 'subjects');
                const subjectsSnap = await getDocs(subjectsRef);

                const allData = await Promise.all(
                    subjectsSnap.docs.map(async (subjDoc) => {
                        const subj = { ...subjDoc.data(), id: subjDoc.id } as Subject;
                        const stacksRef = collection(firestore, 'users', user.uid, 'subjects', subjDoc.id, 'stacks');
                        const stacksSnap = await getDocs(stacksRef);
                        const stacks = stacksSnap.docs.map(d => ({ ...d.data(), id: d.id } as Stack));
                        return { subject: subj, stacks };
                    })
                );

                setData(allData.filter(d => d.stacks.length > 0));
            } catch (e) {
                console.error("Error fetching stacks:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [firestore, user]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">Lade Stacks...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20 animate-in fade-in duration-700">
            <header className="space-y-4">
                <h1 className="text-5xl font-black font-creative tracking-tight">Kartenstapel</h1>
                <p className="text-xl text-muted-foreground font-medium max-w-2xl">
                    Hier findest du alle deine Vokabelstapel sortiert nach Fach.
                </p>
            </header>

            {data.length === 0 ? (
                <div className="bg-white rounded-[3rem] p-20 text-center shadow-xl shadow-primary/5 space-y-6">
                    <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Layers className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-3xl font-black font-creative">Noch keine Stapel</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto font-medium">Erstelle dein erstes Fach und füge Vokabelstapel hinzu, um mit dem Lernen zu beginnen.</p>
                    <Button asChild className="h-16 px-12 rounded-[2rem] text-xl font-bold">
                        <Link href="/dashboard">Zum Dashboard</Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-20">
                    {data.map(({ subject, stacks }) => (
                        <section key={subject.id} className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-2 rounded-full bg-primary/20" />
                                <h2 className="text-3xl font-black font-creative">{subject.name}</h2>
                                <span className="px-4 py-1 bg-secondary rounded-full text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">
                                    {stacks.length} {stacks.length === 1 ? 'Stapel' : 'Stapel'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {stacks.map((stack) => (
                                    <Link key={stack.id} href={`/dashboard/subjects/${subject.id}`}>
                                        <Card className="group relative overflow-hidden bg-white hover:bg-zinc-50 border-none rounded-[2.5rem] p-8 shadow-xl shadow-primary/5 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10">
                                            <div className="space-y-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="h-14 w-14 bg-primary/5 rounded-[1.2rem] flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-500">
                                                        <Layers className="h-7 w-7 text-primary group-hover:text-white transition-all duration-500" />
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-2xl font-black font-creative">{(stack as any).vocabularyCount || 0}</span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Karten</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h3 className="text-2xl font-black font-creative group-hover:text-primary transition-colors duration-300">
                                                        {stack.name}
                                                    </h3>
                                                </div>

                                                <div className="flex items-center justify-between pt-4 border-t border-secondary">
                                                    <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-[-10px] group-hover:translate-x-0">
                                                        Öffnen <ChevronRight className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary/50 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 transition-all duration-500 group-hover:opacity-0">
                                                        {subject.name}
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
