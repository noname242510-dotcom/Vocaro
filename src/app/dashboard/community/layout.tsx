'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where } from 'firebase/firestore';
import type { Friendship } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { RequestsList } from '../friends/_components/RequestsList';

function CommunityNav() {
    const pathname = usePathname();
    const navItems = [
        { href: '/dashboard/community', label: 'Gruppen' },
        { href: '/dashboard/community/freunde', label: 'Freunde' },
        { href: '/dashboard/community/entdecken', label: 'Entdecken' },
    ];
    return (
         <Tabs value={pathname} className="w-auto">
            <TabsList className="bg-transparent h-auto p-0 gap-8">
                {navItems.map(item => (
                    <Link href={item.href} key={item.href} legacyBehavior passHref>
                        <TabsTrigger
                            value={item.href}
                            className="bg-transparent border-none p-0 pb-4 rounded-none text-lg font-semibold data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all font-headline"
                        >
                            {item.label}
                        </TabsTrigger>
                    </Link>
                ))}
            </TabsList>
        </Tabs>
    );
}


export default function CommunityLayout({ children }: { children: React.ReactNode }) {
    const [key, setKey] = useState(0);
    const { user, firestore } = useFirebase();
    const [requestCount, setRequestCount] = useState(0);

    const refreshData = () => {
        setKey(prevKey => prevKey + 1);
    };

    const requestsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'friendships'),
            where('recipientId', '==', user.uid),
            where('status', '==', 'pending')
        );
    }, [user, firestore, key]);

    const { data: friendRequests } = useCollection<Friendship>(requestsQuery);

    useEffect(() => {
        setRequestCount(friendRequests?.length ?? 0);
    }, [friendRequests]);

    return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b pb-8">
                <div className="space-y-2">
                    <h1 className="text-5xl font-bold font-creative tracking-tight text-foreground">Community</h1>
                    <p className="text-xl text-muted-foreground">Vernetze dich und wachse mit anderen Lernenden.</p>
                </div>

                <div className="flex items-center gap-6">
                    <CommunityNav />
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-background border shadow-sm h-12 w-12">
                                <Bell className="h-6 w-6" />
                                {requestCount > 0 && (
                                    <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm animate-in zoom-in">
                                        {requestCount}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 rounded-2xl overflow-hidden shadow-2xl border-none mt-2" align="end">
                            <div className="bg-primary p-4">
                                <h4 className="font-semibold text-sm text-white">Freundschaftsanfragen</h4>
                            </div>
                            <div className="p-2 max-h-[400px] overflow-y-auto bg-card">
                                <RequestsList key={`requests-${key}`} onFriendAction={refreshData} />
                            </div>
                        </PopoverContent>
                    </Popover >
                </div >
            </div >
            {children}
        </div>
    );
}
