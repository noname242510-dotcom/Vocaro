'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Users, Settings, BarChart2, ChevronRight, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Subject } from '@/lib/types';
import { useSubjectsCache } from '@/contexts/subjects-cache-context';

interface NavBarProps {
    subjects: Subject[] | null;
    isLoadingSubjects: boolean;
}

export function NavBar({}: NavBarProps) {
    const pathname = usePathname();
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const { subjects, isLoading } = useSubjectsCache();

    const navItems = [
        { href: '/dashboard', icon: Home },
        { href: '/dashboard/community', icon: Users },
        { id: 'facher', icon: BookOpen, isSheet: true },
        { href: '/dashboard/overview', icon: BarChart2 },
        { href: '/dashboard/settings', icon: Settings },
    ];

    const isActive = (href: string) =>
        pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

    const isSubjectsActive = pathname.startsWith('/dashboard/subjects') || pathname.startsWith('/dashboard/facher');

    return (
        <>
            {/* Fächer Sheet */}
            {isSheetOpen && (
                <div className="fixed inset-0 z-[200] flex flex-col justify-end" style={{ isolation: 'isolate' }}>
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setIsSheetOpen(false)}
                    />
                    {/* Panel */}
                    <div className="relative bg-background rounded-t-3xl w-full flex flex-col shadow-2xl border-t border-border max-h-[70vh]"
                        style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center">
                                    <BookOpen className="h-5 w-5 text-primary-foreground" />
                                </div>
                                <h2 className="font-black text-xl">Deine Fächer</h2>
                            </div>
                            <button
                                onClick={() => setIsSheetOpen(false)}
                                className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        {/* Content */}
                        <div className="overflow-y-auto overscroll-contain flex-1 px-4 py-3">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : subjects && subjects.length > 0 ? (
                                <div className="space-y-1">
                                    {subjects.map((subject) => (
                                        <Link
                                            key={subject.id}
                                            href={`/dashboard/subjects/${subject.id}`}
                                            onClick={() => setIsSheetOpen(false)}
                                            className="flex items-center gap-4 p-4 rounded-2xl hover:bg-secondary active:bg-secondary/70 active:scale-[0.98] transition-all duration-100"
                                        >
                                            <span className="text-2xl w-9 text-center">{subject.emoji}</span>
                                            <span className="flex-1 font-bold text-base">{subject.name}</span>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-4xl mb-3">📚</p>
                                    <p className="font-bold">Noch keine Fächer</p>
                                    <p className="text-sm text-muted-foreground mt-1">Erstelle dein erstes Fach auf der Startseite.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Nav Bar */}
            <div
                className="fixed bottom-0 left-0 right-0 z-[90] md:hidden bg-background/95 backdrop-blur-sm border-t border-border"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <div className="flex items-center justify-around h-16 px-2">
                    {navItems.map((item) => {
                        if (item.isSheet) {
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setIsSheetOpen(true)}
                                    className={cn(
                                        'flex items-center justify-center flex-1 h-full transition-all duration-200 active:scale-90',
                                        isSubjectsActive ? 'text-primary' : 'text-muted-foreground'
                                    )}
                                >
                                    <div className={cn(
                                        'p-2.5 rounded-2xl transition-all duration-200',
                                        isSubjectsActive ? 'bg-primary/10' : 'bg-transparent'
                                    )}>
                                        <item.icon className={cn('h-6 w-6 transition-all duration-200', isSubjectsActive && 'fill-current')} />
                                    </div>
                                </button>
                            );
                        }

                        const active = isActive(item.href!);
                        return (
                            <Link
                                key={item.href}
                                href={item.href!}
                                className={cn(
                                    'flex items-center justify-center flex-1 h-full transition-all duration-200 active:scale-90',
                                    active ? 'text-primary' : 'text-muted-foreground'
                                )}
                            >
                                <div className={cn(
                                    'p-2.5 rounded-2xl transition-all duration-200',
                                    active ? 'bg-primary/10' : 'bg-transparent'
                                )}>
                                    <item.icon className={cn('h-6 w-6 transition-all duration-200', active && 'fill-current')} />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
