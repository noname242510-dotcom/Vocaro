'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where } from 'firebase/firestore';
import type { GroupInvitation } from '@/lib/types';
import { GroupsList } from '../friends/_components/GroupsList';
import { GroupInvitationsList } from '../friends/_components/GroupInvitationsList';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function GroupsPage() {
    const [key, setKey] = useState(0); // Used to force re-renders on components
    const { user, firestore } = useFirebase();
    const [invitationCount, setInvitationCount] = useState(0);

    const refreshData = () => {
        setKey(prevKey => prevKey + 1);
    };

    const invitationsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'groupInvitations'),
            where('recipientId', '==', user.uid),
            where('status', '==', 'pending')
        );
    }, [user, firestore, key]);

    const { data: groupInvites } = useCollection<GroupInvitation>(invitationsQuery);

    useEffect(() => {
        setInvitationCount(groupInvites?.length ?? 0);
    }, [groupInvites]);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center my-4 md:my-8">
                <div className="flex-1"></div>
                <div className="text-center flex-1">
                    <h1 className="text-3xl lg:text-4xl font-bold font-headline">Meine Gruppen</h1>
                    <p className="text-sm text-muted-foreground mt-1">Lerne gemeinsam mit anderen.</p>
                </div>
                <div className="flex-1 flex justify-end">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="relative">
                                <Bell className="h-5 w-5" />
                                {invitationCount > 0 && (
                                    <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                        {invitationCount}
                                    </div>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 mr-4">
                            <h4 className="font-medium text-sm text-center mb-2">Gruppeneinladungen</h4>
                            <GroupInvitationsList key={`group-invites-${key}`} onAction={refreshData} />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <div className="mt-6">
                <GroupsList key={`groups-${key}`} />
            </div>
        </div>
    );
}
