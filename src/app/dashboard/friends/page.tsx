
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserSearch } from './_components/UserSearch';
import { FriendsList } from './_components/FriendsList';
import { RequestsList } from './_components/RequestsList';

export default function FriendsPage() {
  const [key, setKey] = useState(0); // Used to force re-renders on components

  const refreshData = () => {
    setKey(prevKey => prevKey + 1);
  };

  return (
    <div className="max-w-4xl mx-auto">
       <div className="text-center my-4 md:my-8">
        <h1 className="text-3xl lg:text-4xl font-bold font-headline">Freunde</h1>
        <p className="text-sm text-muted-foreground mt-1">Vernetze dich mit anderen Lernenden.</p>
      </div>
      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">Benutzer</TabsTrigger>
          <TabsTrigger value="requests">Anfragen</TabsTrigger>
          <TabsTrigger value="friends">Meine Freunde</TabsTrigger>
        </TabsList>
        <TabsContent value="search" className="mt-6">
          <UserSearch onFriendAction={refreshData} />
        </TabsContent>
        <TabsContent value="requests" className="mt-6">
          <RequestsList key={`requests-${key}`} onFriendAction={refreshData} />
        </TabsContent>
        <TabsContent value="friends" className="mt-6">
          <FriendsList key={`friends-${key}`} onFriendAction={refreshData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
