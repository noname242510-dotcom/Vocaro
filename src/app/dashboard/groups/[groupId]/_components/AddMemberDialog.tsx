'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, collection, query, where, writeBatch, arrayUnion, increment } from 'firebase/firestore';
import type { Group, PublicProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // Original path
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AddMemberDialogProps {
    group: Group;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onInviteSent: () => void;
}

export function AddMemberDialog({ group, isOpen, onOpenChange, onInviteSent }: AddMemberDialogProps) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch user's friends
    const friendshipsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'friendships'),
            where('status', '==', 'accepted'),
            // We need to query where user is either user1 or user2
            // To simplify, we fetch both and combine in JS since Firestore doesn't support OR on different fields easily without multiple queries
        );
    }, [firestore, user]);

    const { data: friendships, isLoading: isFriendshipsLoading } = useCollection(friendshipsQuery);

    // Fetch friend profiles
    const friendIds = useMemo(() => {
        if (!friendships || !user) return [];
        return friendships
            .filter(f => f.requesterId === user.uid || f.recipientId === user.uid) // Corrected from user1Id/user2Id to requesterId/recipientId
            .map(f => f.requesterId === user.uid ? f.recipientId : f.requesterId) // Corrected from user1Id/user2Id to requesterId/recipientId
            // Filter out users already in the group
            .filter(id => !group.memberIds.includes(id));
    }, [friendships, user, group.memberIds]);

    const profilesQuery = useMemoFirebase(() => {
        if (!firestore || friendIds.length === 0) return null;
        // Firestore 'in' queries are limited to 30 items
        const chunks = [];
        for (let i = 0; i < friendIds.length; i += 30) {
            chunks.push(friendIds.slice(i, i + 30));
        }
        // Just take the first 30 friends for now to keep it simple, 
        // a real app might need pagination or multiple queries
        if (chunks.length > 0) {
            return query(
                collection(firestore, 'publicProfiles'),
                where('__name__', 'in', chunks[0])
            );
        }
        return null;
    }, [firestore, friendIds]);

    const { data: friendProfiles, isLoading: isProfilesLoading } = useCollection<PublicProfile>(profilesQuery);

    const filteredFriends = useMemo(() => {
        if (!friendProfiles) return [];
        return friendProfiles.filter(profile =>
            profile.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [friendProfiles, searchQuery]);

    const handleToggleSelect = (friendId: string) => {
        setSelectedFriends(prev =>
            prev.includes(friendId)
                ? prev.filter(id => id !== friendId)
                : [...prev, friendId]
        );
    };

    const handleAddMembers = async () => {
        if (selectedFriends.length === 0 || !firestore || !user) return;
        setIsSubmitting(true);

        try {
            const groupRef = doc(firestore, 'groups', group.id);
            const batch = writeBatch(firestore);

            // Add new members to the group directly
            batch.update(groupRef, {
                memberIds: arrayUnion(...selectedFriends),
                memberCount: increment(selectedFriends.length)
            });

            await batch.commit();

            toast({
                title: "Erfolg!",
                description: "Die ausgewählten Freunde wurden der Gruppe hinzugefügt.",
            });

            onInviteSent(); // Trigger refresh on parent
            onOpenChange(false);
            setSelectedFriends([]); // Reset selection
        } catch (error) {
            console.error("Error adding members:", error);
            toast({
                title: "Fehler beim Hinzufügen",
                description: "Bitte versuche es später noch einmal.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setSelectedFriends([]);
            setSearchQuery('');
        }
    }, [isOpen]);

    const isLoading = isFriendshipsLoading || isProfilesLoading;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Freunde hinzufügen</DialogTitle>
                    <DialogDescription>
                        Füge Freunde direkt zu deiner Gruppe hinzu.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative mb-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Freunde suchen..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                    {isLoading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : friendProfiles?.length === 0 ? (
                        <p className="text-center text-muted-foreground p-4">
                            Keine verfügbaren Freunde gefunden.
                        </p>
                    ) : filteredFriends.length === 0 ? (
                        <p className="text-center text-muted-foreground p-4">
                            Keine Freunde mit diesem Namen gefunden.
                        </p>
                    ) : (
                        filteredFriends.map((friend) => (
                            <div
                                key={friend.id}
                                className={`flex items-center space-x-4 p-2 rounded-lg cursor-pointer transition-colors ${selectedFriends.includes(friend.id) ? 'bg-primary/10 border-primary border' : 'hover:bg-muted border border-transparent'
                                    }`}
                                onClick={() => handleToggleSelect(friend.id)}
                            >
                                <Avatar>
                                    <AvatarImage src={friend.photoURL || undefined} />
                                    <AvatarFallback>{friend.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">{friend.displayName}</p>
                                </div>
                                <div className={`flex h-5 w-5 items-center justify-center rounded-sm border border-primary ${selectedFriends.includes(friend.id) ? 'bg-primary text-primary-foreground' : 'text-transparent'
                                    }`}>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-3.5 w-3.5"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Abbrechen
                    </Button>
                    <Button
                        onClick={handleAddMembers}
                        disabled={selectedFriends.length === 0 || isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Hinzufügen ({selectedFriends.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
