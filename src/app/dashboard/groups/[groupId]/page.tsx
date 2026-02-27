'use client';

import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, collection, query, where } from 'firebase/firestore';
import type { Group, PublicProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';


function MemberList({ group }: { group: Group }) {
    const { firestore } = useFirebase();
    
    const membersQuery = useMemoFirebase(() => {
        if (!firestore || !group.memberIds || group.memberIds.length === 0) return null;
        // Firestore 'in' query is limited to 30 items. For larger groups, pagination would be needed.
        const idsToQuery = group.memberIds.slice(0, 30);
        return query(collection(firestore, 'publicProfiles'), where('__name__', 'in', idsToQuery));
    }, [firestore, group.memberIds]);

    const { data: members, isLoading } = useCollection<PublicProfile>(membersQuery);
    
    const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : '');

    if (isLoading) {
        return <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />;
    }

    return (
        <div className="space-y-3">
            {members?.map(member => (
                <Card key={member.id} className="p-3">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={member.photoURL} />
                            <AvatarFallback>{getInitials(member.displayName)}</AvatarFallback>
                        </Avatar>
                        <p className="font-semibold">{member.displayName}</p>
                    </div>
                </Card>
            ))}
        </div>
    );
}


export default function GroupDetailPage() {
    const params = useParams();
    const router = useRouter();
    const groupId = params.groupId as string;
    const { firestore } = useFirebase();

    const groupDocRef = useMemoFirebase(() => {
        if (!firestore || !groupId) return null;
        return doc(firestore, 'groups', groupId);
    }, [firestore, groupId]);

    const { data: group, isLoading: isGroupLoading } = useDoc<Group>(groupDocRef);
    
    if (isGroupLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-muted-foreground" /></div>;
    }

    if (!group) {
        return (
            <div className="text-center mt-20">
                <h2 className="text-xl font-bold">Gruppe nicht gefunden</h2>
                <Button variant="link" onClick={() => router.back()}>Zurück</Button>
            </div>
        );
    }
    
    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/friends?tab=groups')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-secondary rounded-full">
                      <Users className="h-8 w-8 text-secondary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold font-headline">{group.name}</h1>
                        <p className="text-muted-foreground">{group.memberCount} Mitglieder</p>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Mitglieder</CardTitle>
                </CardHeader>
                <CardContent>
                    <MemberList group={group} />
                </CardContent>
            </Card>
        </div>
    );
}
