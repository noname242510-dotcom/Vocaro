'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where } from 'firebase/firestore';
import type { Friendship, GroupInvitation } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserSearch } from './_components/UserSearch';
import { FriendsList } from './_components/FriendsList';
import { RequestsList } from './_components/RequestsList';
import { GroupsList } from './_components/GroupsList';
import { GroupInvitationsList } from './_components/GroupInvitationsList';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function FriendsPage() {
  const [key, setKey] = useState(0); // Used to force re-renders on components
  const { user, firestore } = useFirebase();
  const [requestCount, setRequestCount] = useState(0);
  const [invitationCount, setInvitationCount] = useState(0);

  const refreshData = () => {
    setKey(prevKey => prevKey + 1);
  };
  
  // Fetch counts for the notification badge
  const requestsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'friendships'),
      where('recipientId', '==', user.uid),
      where('status', '==', 'pending')
    );
  }, [user, firestore, key]);

  const invitationsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'groupInvitations'),
      where('recipientId', '==', user.uid),
      where('status', '==', 'pending')
    );
  }, [user, firestore, key]);
  
  const { data: friendRequests } = useCollection<Friendship>(requestsQuery);
  const { data: groupInvites } = useCollection<GroupInvitation>(invitationsQuery);
  
  useEffect(() => {
    setRequestCount(friendRequests?.length ?? 0);
  }, [friendRequests]);
  
  useEffect(() => {
    setInvitationCount(groupInvites?.length ?? 0);
  }, [groupInvites]);

  const totalNotifications = requestCount + invitationCount;

  return (
    <div className="max-w-4xl mx-auto">
       <div className="flex justify-between items-center my-4 md:my-8">
        <div className="flex-1"></div>
        <div className="text-center flex-1">
          <h1 className="text-3xl lg:text-4xl font-bold font-headline">Freunde & Gruppen</h1>
          <p className="text-sm text-muted-foreground mt-1">Vernetze dich mit anderen Lernenden.</p>
        </div>
        <div className="flex-1 flex justify-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {totalNotifications > 0 && (
                    <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {totalNotifications}
                    </div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 mr-4">
               <h4 className="font-medium text-sm text-center mb-2">Freundschaftsanfragen</h4>
               <RequestsList key={`requests-${key}`} onFriendAction={refreshData} />
               <Separator className="my-4" />
               <h4 className="font-medium text-sm text-center mb-2">Gruppeneinladungen</h4>
               <GroupInvitationsList key={`group-invites-${key}`} onAction={refreshData} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends">Meine Freunde</TabsTrigger>
          <TabsTrigger value="groups">Meine Gruppen</TabsTrigger>
          <TabsTrigger value="search">Benutzer finden</TabsTrigger>
        </TabsList>
        <TabsContent value="friends" className="mt-6">
          <FriendsList key={`friends-${key}`} onFriendAction={refreshData} />
        </TabsContent>
        <TabsContent value="groups" className="mt-6">
            <GroupsList key={`groups-${key}`} />
        </TabsContent>
        <TabsContent value="search" className="mt-6">
          <UserSearch onFriendAction={refreshData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
