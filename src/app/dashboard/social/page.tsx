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

export default function SocialPage() {
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
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Community Hub</h1>
                    <p className="text-muted-foreground mt-1">Vernetze dich, tritt Gruppen bei und lerne gemeinsam.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="lg" className="relative rounded-xl border-2">
                                <Bell className="h-5 w-5 mr-2" />
                                Anfragen
                                {requestCount > 0 && (
                                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm animate-in zoom-in">
                                        {requestCount}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 rounded-2xl overflow-hidden shadow-2xl" align="end">
                            <div className="bg-primary/5 p-4 border-b">
                                <h4 className="font-semibold text-sm">Freundschaftsanfragen</h4>
                            </div>
                            <div className="p-2 max-h-[400px] overflow-y-auto">
                                <RequestsList key={`requests-${key}`} onFriendAction={refreshData} />
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <Tabs defaultValue="groups" className="w-full">
                <TabsList className="inline-flex h-12 items-center justify-center rounded-2xl bg-muted p-1 text-muted-foreground w-full md:w-auto mb-8">
                    <TabsTrigger value="groups" className="rounded-xl px-8 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Gruppen
                    </TabsTrigger>
                    <TabsTrigger value="friends" className="rounded-xl px-8 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                        <Users className="h-4 w-4 mr-2" />
                        Freunde
                    </TabsTrigger>
                    <TabsTrigger value="search" className="rounded-xl px-8 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Entdecken
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="groups" className="mt-0 outline-none">
                    <Card className="border-none shadow-none bg-transparent">
                        <CardHeader className="px-0 pt-0">
                            <CardTitle>Deine Lerngruppen</CardTitle>
                            <CardDescription>Teile Vokabeln und lerne effizienter im Team.</CardDescription>
                        </CardHeader>
                        <CardContent className="px-0">
                            <GroupsList key={`groups-${key}`} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="friends" className="mt-0 outline-none">
                    <Card className="border-none shadow-none bg-transparent">
                        <CardHeader className="px-0 pt-0">
                            <CardTitle>Meine Freunde</CardTitle>
                            <CardDescription>Sieh dir an, was deine Freunde gerade lernen.</CardDescription>
                        </CardHeader>
                        <CardContent className="px-0">
                            <FriendsList key={`friends-${key}`} onFriendAction={refreshData} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="search" className="mt-0 outline-none">
                    <Card className="border-2 border-dashed rounded-3xl">
                        <CardHeader>
                            <CardTitle>Benutzer finden</CardTitle>
                            <CardDescription>Suche nach anderen Lernenden über ihren Namen.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserSearch onFriendAction={refreshData} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
