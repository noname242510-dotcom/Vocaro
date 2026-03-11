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
        { href: '/dashboard/community', icon: Users, label: 'Community' },
        { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ];

    const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-primary/5 pb-safe-area-inset-bottom md:hidden shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-around h-20 px-4">
                {navItems.map((item) => {
                    if (item.isSheet) {
                        return (
                            <Sheet key={item.id} open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                                <SheetTrigger asChild>
                                    <button
                                        className={cn(
                                            "flex flex-col items-center justify-center flex-1 transition-all duration-300 transform active:scale-90",
                                            "text-muted-foreground hover:text-primary"
                                        )}
                                    >
                                        <item.icon className="h-6 w-6" />
                                        <span className="text-[10px] mt-1.5 font-black uppercase tracking-widest opacity-60 leading-none">{item.label}</span>
                                    </button>
                                </SheetTrigger>
                                <SheetContent side="bottom" className="rounded-t-[3rem] h-[75vh] p-0 border-none shadow-2xl">
                                    <div className="p-10">
                                        <SheetHeader className="mb-8">
                                            <SheetTitle className="text-4xl font-black font-creative flex items-center gap-4">
                                                <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center">
                                                    <BookOpen className="h-6 w-6 text-white" />
                                                </div>
                                                Deine Fächer
                                            </SheetTitle>
                                        </SheetHeader>
                                        <ScrollArea className="h-[calc(75vh-12rem)] pr-4">
                                            <div className="grid gap-4">
                                                {isLoadingSubjects ? (
                                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                                        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Lade Fächer...</p>
                                                    </div>
                                                ) : subjects && subjects.length > 0 ? (
                                                    subjects.map((subject) => (
                                                        <Link
                                                            key={subject.id}
                                                            href={`/dashboard/subjects/${subject.id}`}
                                                            onClick={() => setIsSheetOpen(false)}
                                                            className="group flex items-center justify-between p-6 rounded-[2rem] bg-secondary/50 hover:bg-white hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 border border-transparent hover:border-primary/10"
                                                        >
                                                            <div className="flex items-center gap-5">
                                                                <span className="text-4xl drop-shadow-sm">{subject.emoji}</span>
                                                                <div className="flex flex-col">
                                                                    <span className="font-black text-xl font-creative tracking-tight">{subject.name}</span>
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Verwalten & Lernen</span>
                                                                </div>
                                                            </div>
                                                            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                                                                <ChevronRight className="h-5 w-5" />
                                                            </div>
                                                        </Link>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-20 bg-secondary/30 rounded-[3rem]">
                                                        <p className="text-xl font-bold mb-6">Noch keine Fächer</p>
                                                        <Button asChild className="h-14 px-8 rounded-2xl font-black">
                                                            <Link href="/dashboard">Erstes Fach erstellen</Link>
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

                    const active = isActive(item.href || '');

                    return (
                        <Link
                            key={item.href}
                            href={item.href || '#'}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 transition-all duration-300 transform active:scale-90",
                                active ? "text-primary scale-110" : "text-muted-foreground hover:text-primary"
                            )}
                        >
                            <item.icon className={cn("h-6 w-6 transition-all duration-300", active && "drop-shadow-[0_0_10px_rgba(0,0,0,0.1)] fill-current")} />
                            <span className={cn(
                                "text-[10px] mt-1.5 font-black uppercase tracking-widest leading-none",
                                active ? "opacity-100" : "opacity-60"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

function Loader2({ className }: { className?: string }) {
    return (
        <svg
            className={cn("animate-spin", className)}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            ></circle>
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
        </svg>
    )
}
