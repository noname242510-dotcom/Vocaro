'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { Friendship, PublicProfile, Group } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function AddMemberDialog({ group, isOpen, onOpenChange, onInviteSent }: { group: Group, isOpen: boolean; onOpenChange: (open: boolean) => void; onInviteSent: () => void; }) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [friends, setFriends] = useState<PublicProfile[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);

    const friendsAsRequesterQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'friendships'), where('requesterId', '==', user.uid), where('status', '==', 'accepted'));
    }, [user, firestore]);
    const friendsAsRecipientQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'friendships'), where('recipientId', '==', user.uid), where('status', '==', 'accepted'));
    }, [user, firestore]);

    const { data: friendships1 } = useCollection<Friendship>(friendsAsRequesterQuery);
    const { data: friendships2 } = useCollection<Friendship>(friendsAsRecipientQuery);

    useEffect(() => {
        if (!isOpen) return;
        const fetchFriendDetails = async () => {
            if (!user || !firestore || !friendships1 || !friendships2) return;

            const allFriendships = [...friendships1, ...friendships2];
            const friendIds = allFriendships.map(f => f.requesterId === user.uid ? f.recipientId : f.requesterId);
            const nonMemberFriendIds = friendIds.filter(id => !group.memberIds.includes(id));

            if (nonMemberFriendIds.length > 0) {
                const profilesRef = collection(firestore, 'publicProfiles');
                const profilesQuery = query(profilesRef, where('__name__', 'in', nonMemberFriendIds));
                const profilesSnapshot = await getDocs(profilesQuery);
                const profilesData = profilesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PublicProfile));
                setFriends(profilesData);
            } else {
                setFriends([]);
            }
        };
        fetchFriendDetails();
    }, [isOpen, friendships1, friendships2, user, firestore, group.memberIds]);

    const handleFriendSelect = (friendId: string) => {
        setSelectedFriends(prev => {
            const newSet = new Set(prev);
            if (newSet.has(friendId)) {
                newSet.delete(friendId);
            } else {
                newSet.add(friendId);
            }
            return newSet;
        });
    };

    const handleInviteMembers = async () => {
        if (selectedFriends.size === 0) {
            toast({ variant: 'destructive', title: 'Fehler', description: 'Wähle mindestens einen Freund aus.' });
            return;
        }
        if (!user || !firestore) return;
        setIsLoading(true);

        try {
            const batch = writeBatch(firestore);

            selectedFriends.forEach(friendId => {
                const invitationId = `${group.id}_${friendId}`;
                const invitationRef = doc(firestore, 'groupInvitations', invitationId);
                batch.set(invitationRef, {
                    id: invitationId,
                    groupId: group.id,
                    groupName: group.name,
                    inviterId: user.uid,
                    inviterName: user.displayName,
                    recipientId: friendId,
                    status: 'pending',
                    createdAt: serverTimestamp(),
                });
            });

            await batch.commit();
            toast({ title: 'Erfolg!', description: `Einladungen versendet.` });
            onInviteSent();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Fehler', description: 'Einladungen konnten nicht versendet werden.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setSelectedFriends(new Set());
        }
    }, [isOpen]);

    const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : '');

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Mitglieder zu "{group.name}" einladen</DialogTitle>
                    <DialogDescription>Wähle Freunde aus, die du einladen möchtest.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {friends.length > 0 ? (
                        <div className="grid gap-2">
                            <Label>Freunde einladen</Label>
                            <ScrollArea className="h-60 rounded-md border p-2">
                                <div className="space-y-2">
                                    {friends.map(friend => (
                                        <div key={friend.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={friend.photoURL} />
                                                    <AvatarFallback>{getInitials(friend.displayName)}</AvatarFallback>
                                                </Avatar>
                                                <Label htmlFor={`friend-${friend.id}`} className="font-normal">{friend.displayName}</Label>
                                            </div>
                                            <Checkbox
                                                id={`friend-${friend.id}`}
                                                checked={selectedFriends.has(friend.id)}
                                                onCheckedChange={() => handleFriendSelect(friend.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : (
                        <p className="text-center text-sm text-muted-foreground p-4">Alle deine Freunde sind bereits in dieser Gruppe.</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
                    <Button onClick={handleInviteMembers} disabled={isLoading || selectedFriends.size === 0}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Einladen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
