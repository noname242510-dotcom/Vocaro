'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BookOpen, Layers, ChevronRight, Loader2, ChevronDown, Plus, GraduationCap
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Subject, Stack } from '@/lib/types';

type SubjectWithStacks = {
    subject: Subject;
    stacks: Stack[];
    isExpanded: boolean;
};

export default function SubjectsOverviewPage() {
    const { firestore, user } = useFirebase();
    const [data, setData] = useState<SubjectWithStacks[]>([]);
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
                        return { subject: subj, stacks, isExpanded: false };
                    })
                );

                setData(allData);
            } catch (e) {
                console.error('Error fetching subjects:', e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [firestore, user]);

    const toggleExpand = (index: number) => {
        setData(prev =>
            prev.map((item, i) =>
                i === index ? { ...item, isExpanded: !item.isExpanded } : item
            )
        );
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground opacity-60">Lade Fächer...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-28 md:pb-12 animate-in fade-in duration-700">
            {/* Page Header */}
            <header className="space-y-2 pb-4 border-b">
                <h1 className="text-5xl font-bold font-creative tracking-tight text-foreground">Sprachen</h1>
                <p className="text-xl text-muted-foreground">
                    {data.length > 0
                        ? `${data.length} ${data.length === 1 ? 'Fach' : 'Fächer'} · ${data.reduce((acc, d) => acc + d.stacks.length, 0)} Stapel`
                        : 'Starte deine Lernreise mit deinem ersten Fach.'}
                </p>
            </header>

            {/* Content */}
            {data.length === 0 ? (
                <div className="bg-card rounded-[3rem] p-20 text-center shadow-xl shadow-primary/5 space-y-6">
                    <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <GraduationCap className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                    <h2 className="text-2xl font-bold font-headline text-foreground">Noch keine Fächer</h2>
                    <p className="text-muted-foreground max-w-sm mx-auto font-medium">
                        Erstelle dein erstes Fach auf der Startseite, um mit dem Lernen zu beginnen.
                    </p>
                    <Button asChild className="h-14 px-10 rounded-2xl font-bold shadow-md shadow-primary/20">
                        <Link href="/dashboard">Zum Dashboard →</Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    {data.map(({ subject, stacks, isExpanded }, index) => (
                        <div key={subject.id} className="group">
                            {/* Subject Card */}
                            <Link href={`/dashboard/subjects/${subject.id}`}>
                                <Card className="bg-card border-none rounded-[2rem] shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 overflow-hidden">
                                    <div className="p-6 md:p-8 flex items-center gap-6">
                                        {/* Emoji */}
                                        <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-secondary/50 flex items-center justify-center text-3xl shadow-sm">
                                            {subject.emoji}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-xl font-semibold font-headline text-foreground group-hover:text-primary transition-colors truncate">
                                                {subject.name}
                                            </h2>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-sm font-semibold text-muted-foreground">
                                                    {stacks.length} {stacks.length === 1 ? 'Stapel' : 'Stapel'}
                                                </span>
                                                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                                <span className="text-sm font-semibold text-muted-foreground">
                                                    {stacks.reduce((acc, s) => acc + (s.vocabCount || 0), 0)} Vokabeln
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {stacks.length > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 rounded-xl hover:bg-secondary"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleExpand(index); }}
                                                >
                                                    <ChevronDown className={cn("h-5 w-5 transition-transform duration-300", isExpanded && "rotate-180")} />
                                                </Button>
                                            )}
                                            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-secondary/50 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                                <ChevronRight className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>

                            {/* Expandable Stacks List */}
                            {isExpanded && stacks.length > 0 && (
                                <div className="mt-3 ml-4 md:ml-8 space-y-2 animate-in slide-in-from-top-2 duration-300">
                                    {stacks.map((stack) => (
                                        <Link
                                            key={stack.id}
                                            href={`/dashboard/subjects/${subject.id}`}
                                            className="flex items-center justify-between p-4 md:p-5 rounded-2xl bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-border transition-all duration-200 group/stack"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
                                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-base font-medium text-foreground group-hover/stack:text-primary transition-colors">{stack.name}</p>
                                                    <p className="text-xs font-semibold text-muted-foreground">{stack.vocabCount || 0} Vokabeln</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover/stack:opacity-100 transition-opacity" />
                                        </Link>
                                    ))}

                                    {/* Add Stack Link */}
                                    <Link
                                        href={`/dashboard/subjects/${subject.id}`}
                                        className="flex items-center gap-4 p-4 md:p-5 rounded-2xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200"
                                    >
                                        <div className="h-9 w-9 rounded-xl border border-dashed border-current flex items-center justify-center">
                                            <Plus className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-semibold">Neuer Stapel hinzufügen</span>
                                    </Link>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
