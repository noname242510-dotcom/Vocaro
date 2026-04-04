'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Users, Settings, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Subject } from '@/lib/types';

interface NavBarProps {
    subjects: Subject[] | null;
    isLoadingSubjects: boolean;
}

export function NavBar({}: NavBarProps) {
    const pathname = usePathname();

    const navItems = [
        { href: '/dashboard', icon: Home, label: 'Home' },
        { href: '/dashboard/community', icon: Users, label: 'Community' },
        { href: '/dashboard/facher', icon: BookOpen, label: 'Fächer' },
        { href: '/dashboard/overview', icon: BarChart2, label: 'Statistiken' },
        { href: '/dashboard/settings', icon: Settings, label: 'Einst.' },
    ];

    const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

    return (
        <div 
            className="fixed bottom-2 left-4 right-4 z-[90] h-24 rounded-[3rem] bg-background/95 backdrop-blur-sm border border-primary/10 p-2 md:hidden shadow-2xl shadow-primary/5"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="flex items-center justify-around h-full">
                {navItems.map((item) => {
                    const active = isActive(item.href || '');

                    return (
                        <Link
                            key={item.href}
                            href={item.href || '#'}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 transition-all duration-300 transform active:scale-95",
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

