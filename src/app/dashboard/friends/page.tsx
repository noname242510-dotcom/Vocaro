'use client';

import { useState } from 'react';
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

  const refreshData = () => {
    setKey(prevKey => prevKey + 1);
  };

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
              <Button variant="outline" size="icon">
                <Bell className="h-5 w-5" />
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