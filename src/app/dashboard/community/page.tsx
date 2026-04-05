'use client';

import Link from 'next/link';
import { Users, Globe, MessageCircle, Trophy } from 'lucide-react';
import { GroupsList } from '../friends/_components/GroupsList';

const communityCards = [
    {
        href: '/dashboard/community/freunde',
        icon: Users,
        title: 'Freunde',
        description: 'Deine Lernfreunde',
        iconBg: 'bg-blue-50 dark:bg-blue-950',
        iconColor: 'text-blue-500',
    },
    {
        href: '/dashboard/community/entdecken',
        icon: Globe,
        title: 'Entdecken',
        description: 'Neue Lernende finden',
        iconBg: 'bg-green-50 dark:bg-green-950',
        iconColor: 'text-green-500',
    },
    {
        href: '/dashboard/community',
        icon: MessageCircle,
        title: 'Gruppen',
        description: 'Lerngruppen beitreten',
        iconBg: 'bg-purple-50 dark:bg-purple-950',
        iconColor: 'text-purple-500',
    },
    {
        href: '/dashboard/overview',
        icon: Trophy,
        title: 'Rangliste',
        description: 'Dein Rang & Statistiken',
        iconBg: 'bg-orange-50 dark:bg-orange-950',
        iconColor: 'text-orange-500',
    },
];

export default function CommunityGroupsPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <section>
                <h1 className="text-3xl font-black font-creative tracking-tight">Community</h1>
                <p className="text-sm text-muted-foreground mt-1">Lerne gemeinsam mit anderen.</p>
            </section>

            {/* 2×2 Hub Grid */}
            <div className="grid grid-cols-2 gap-3">
                {communityCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Link key={card.href} href={card.href}>
                            <div className="bg-card rounded-2xl p-4 shadow-sm hover:shadow-md active:scale-95 transition-all duration-150 border border-transparent hover:border-primary/10">
                                <div className={`h-10 w-10 rounded-xl ${card.iconBg} flex items-center justify-center mb-3`}>
                                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                                </div>
                                <p className="font-black text-base leading-tight">{card.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Groups List below */}
            <section className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Meine Gruppen</h2>
                <GroupsList key="groups-list" />
            </section>
        </div>
    );
}
