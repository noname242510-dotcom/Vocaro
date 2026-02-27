'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, arrayUnion } from 'firebase/firestore';
import type { Friendship, PublicProfile } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';

export function CreateGroupDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void; }) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [groupName, setGroupName] = useState('');
    const [friends, setFriends] = useState<PublicProfile[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);

    // Fetch friends to invite
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
        const fetchFriendDetails = async () => {
            if (!user || !firestore || !friendships1 || !friendships2) return;

            const allFriendships = [...friendships1, ...friendships2];
            const friendIds = allFriendships.map(f => f.requesterId === user.uid ? f.recipientId : f.requesterId);

            if (friendIds.length > 0) {
                const profilesRef = collection(firestore, 'publicProfiles');
                const profilesQuery = query(profilesRef, where('__name__', 'in', friendIds));
                const profilesSnapshot = await getDocs(profilesQuery);
                const profilesData = profilesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PublicProfile));
                setFriends(profilesData);
            }
        };
        fetchFriendDetails();
    }, [friendships1, friendships2, user, firestore]);

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

    const handleCreateGroup = async () => {
        if (!groupName.trim() || !user || !firestore) {
            toast({ variant: 'destructive', title: 'Fehler', description: 'Gruppenname ist erforderlich.' });
            return;
        }
        setIsLoading(true);

        try {
            const batch = writeBatch(firestore);
            const groupRef = doc(collection(firestore, 'groups'));
            const memberIds = [user.uid]; // Creator is always a member
            
            // Create group
            batch.set(groupRef, {
                name: groupName,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                memberIds: memberIds, // Initially just the creator
                memberCount: 1,
            });

            // Create invitations for selected friends
            const invitationsRef = collection(firestore, 'groupInvitations');
            selectedFriends.forEach(friendId => {
                const invitationRef = doc(invitationsRef);
                batch.set(invitationRef, {
                    groupId: groupRef.id,
                    groupName: groupName,
                    inviterId: user.uid,
                    inviterName: user.displayName,
                    recipientId: friendId,
                    status: 'pending',
                    createdAt: serverTimestamp(),
                });
            });

            await batch.commit();
            toast({ title: 'Erfolg!', description: `Gruppe "${groupName}" erstellt und Einladungen versendet.` });
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Fehler', description: 'Gruppe konnte nicht erstellt werden.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setGroupName('');
            setSelectedFriends(new Set());
        }
    }, [isOpen]);

    const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : '');

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Neue Gruppe erstellen</DialogTitle>
                    <DialogDescription>Gib deiner Gruppe einen Namen und lade Freunde ein.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="group-name">Gruppenname</Label>
                        <Input id="group-name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                    </div>
                    {friends.length > 0 && (
                        <div className="grid gap-2">
                            <Label>Freunde einladen</Label>
                            <ScrollArea className="h-40 rounded-md border p-2">
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
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
                    <Button onClick={handleCreateGroup} disabled={isLoading || !groupName.trim()}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Gruppe erstellen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
