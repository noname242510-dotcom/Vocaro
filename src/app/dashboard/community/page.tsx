'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where } from 'firebase/firestore';
import type { Friendship } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserSearch } from '../friends/_components/UserSearch';
import { FriendsList } from '../friends/_components/FriendsList';
import { RequestsList } from '../friends/_components/RequestsList';
import { GroupsList } from '../friends/_components/GroupsList';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, Users, UserPlus, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CommunityPage() {
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
                    <Tabs defaultValue="groups" className="w-auto">
                        <TabsList className="bg-transparent h-auto p-0 gap-8">
                            <TabsTrigger
                                value="groups"
                                className="bg-transparent border-none p-0 pb-4 rounded-none text-lg font-semibold data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all font-headline"
                            >
                                Gruppen
                            </TabsTrigger>
                            <TabsTrigger
                                value="friends"
                                className="bg-transparent border-none p-0 pb-4 rounded-none text-lg font-semibold data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all font-headline"
                            >
                                Freunde
                            </TabsTrigger>
                            <TabsTrigger
                                value="search"
                                className="bg-transparent border-none p-0 pb-4 rounded-none text-lg font-semibold data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all font-headline"
                            >
                                Entdecken
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

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

            <Tabs defaultValue="groups" className="w-full">
                <TabsContent value="groups" className="mt-0 outline-none space-y-12">
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-card p-2 rounded-lg border shadow-sm">
                                <Users className="h-5 w-5" />
                            </div>
                            <h2 className="text-xl font-bold font-headline tracking-tight">Deine Lerngruppen</h2>
                        </div>
                        <GroupsList key={`groups-${key}`} />
                    </section>
                </TabsContent>

                <TabsContent value="friends" className="mt-0 outline-none space-y-12">
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-card p-2 rounded-lg border shadow-sm">
                                <Users className="h-5 w-5" />
                            </div>
                            <h2 className="text-xl font-bold font-headline tracking-tight">Meine Freunde</h2>
                        </div>
                        <FriendsList key={`friends-${key}`} onFriendAction={refreshData} />
                    </section>
                </TabsContent>

                <TabsContent value="search" className="mt-0 outline-none">
                    <Card className="border-none shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden">
                        <CardHeader className="p-10 pb-4">
                            <CardTitle className="text-3xl font-bold">Benutzer finden</CardTitle>
                            <CardDescription className="text-lg">Suche nach anderen Lernenden über ihren Namen.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-10 pt-0">

                            <UserSearch onFriendAction={refreshData} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs >
        </div >
    );
}