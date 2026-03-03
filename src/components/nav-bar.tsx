'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Zap, Users, Settings, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Subject } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavBarProps {
    subjects: Subject[] | null;
    isLoadingSubjects: boolean;
}

export function NavBar({ subjects, isLoadingSubjects }: NavBarProps) {
    const pathname = usePathname();
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);

    const navItems = [
        { href: '/dashboard', icon: Home, label: 'Home' },
        { id: 'subjects', icon: BookOpen, label: 'Fächer', isSheet: true },
        { href: '/dashboard/learn', icon: Zap, label: 'Lernen', isPrimary: true },
        { href: '/dashboard/community', icon: Users, label: 'Community' },
        { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ];

    const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t pb-safe-area-inset-bottom md:hidden">
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    if (item.isSheet) {
                        return (
                            <Sheet key={item.id} open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                                <SheetTrigger asChild>
                                    <button
                                        className={cn(
                                            "flex flex-col items-center justify-center flex-1 transition-colors",
                                            "text-muted-foreground hover:text-primary"
                                        )}
                                    >
                                        <item.icon className="h-6 w-6" />
                                        <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                                    </button>
                                </SheetTrigger>
                                <SheetContent side="bottom" className="rounded-t-[2rem] h-[60vh] p-0">
                                    <div className="p-6">
                                        <SheetHeader className="mb-4">
                                            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                                                <BookOpen className="h-6 w-6 text-primary" />
                                                Deine Fächer
                                            </SheetTitle>
                                        </SheetHeader>
                                        <ScrollArea className="h-[calc(60vh-8rem)]">
                                            <div className="grid gap-3">
                                                {isLoadingSubjects ? (
                                                    <p className="text-center text-muted-foreground py-10">Lade Fächer...</p>
                                                ) : subjects && subjects.length > 0 ? (
                                                    subjects.map((subject) => (
                                                        <Link
                                                            key={subject.id}
                                                            href={`/dashboard/subjects/${subject.id}`}
                                                            onClick={() => setIsSheetOpen(false)}
                                                            className="group flex items-center justify-between p-4 rounded-2xl bg-secondary/50 hover:bg-secondary transition-all"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-3xl">{subject.emoji}</span>
                                                                <span className="font-semibold text-lg">{subject.name}</span>
                                                            </div>
                                                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                                        </Link>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-10">
                                                        <p className="text-muted-foreground mb-4">Noch keine Fächer erstellt.</p>
                                                        <Button asChild className="rounded-full">
                                                            <Link href="/dashboard">Fach erstellen</Link>
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        );
                    }

                    if (item.isPrimary) {
                        return (
                            <button
                                onClick={async () => {
                                    if (subjects && subjects.length > 0) {
                                        const firstSubject = subjects[0];
                                        sessionStorage.setItem('learn-session-subject', firstSubject.id);
                                        // Simple learn first subject for now
                                        window.location.href = '/dashboard/learn';
                                    } else {
                                        window.location.href = '/dashboard';
                                    }
                                }}
                                className="relative -top-3 flex flex-col items-center"
                            >
                                <div className={cn(
                                    "h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 transition-transform active:scale-90",
                                    isActive(item.href || '') && "ring-4 ring-primary/20"
                                )}>
                                    <item.icon className="h-7 w-7 text-primary-foreground" />
                                </div>
                                <span className="text-[10px] mt-1 font-semibold text-primary">{item.label}</span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href || '#'}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 transition-colors",
                                isActive(item.href || '') ? "text-primary" : "text-muted-foreground hover:text-primary"
                            )}
                        >
                            <item.icon className="h-6 w-6" />
                            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
