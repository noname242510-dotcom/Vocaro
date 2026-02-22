'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, UserX, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
import type { Friendship, PublicProfile } from '@/lib/types';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';

type EnrichedFriend = PublicProfile & { friendshipId: string };

export function FriendsList({ onFriendAction }: { onFriendAction: () => void }) {
  const { firestore, user } = useFirebase();
  const [friends, setFriends] = useState<EnrichedFriend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [friendToRemove, setFriendToRemove] = useState<EnrichedFriend | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const friendsAsRequesterQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'friendships'),
      where('requesterId', '==', user.uid),
      where('status', '==', 'accepted')
    );
  }, [user, firestore]);

  const friendsAsRecipientQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'friendships'),
      where('recipientId', '==', user.uid),
      where('status', '==', 'accepted')
    );
  }, [user, firestore]);

  const { data: friendships1 } = useCollection<Friendship>(friendsAsRequesterQuery);
  const { data: friendships2 } = useCollection<Friendship>(friendsAsRecipientQuery);

  useEffect(() => {
    const fetchFriendDetails = async () => {
      if (!user || !firestore || friendships1 === null || friendships2 === null) {
        setIsLoading(friendships1 === null || friendships2 === null);
        return;
      };
      
      setIsLoading(true);
      const allFriendships = [...(friendships1 || []), ...(friendships2 || [])];
      const friendIds = allFriendships.map(f => f.requesterId === user.uid ? f.recipientId : f.requesterId);
      
      if (friendIds.length === 0) {
        setFriends([]);
        setIsLoading(false);
        return;
      }
      
      const uniqueFriendIds = [...new Set(friendIds)];
      
      try {
        const profilesRef = collection(firestore, 'publicProfiles');
        const profilesQuery = query(profilesRef, where('__name__', 'in', uniqueFriendIds));
        const profilesSnapshot = await getDocs(profilesQuery);
        const profilesData = profilesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PublicProfile));
        
        const enriched = profilesData.map(profile => {
          const friendship = allFriendships.find(f => f.requesterId === profile.id || f.recipientId === profile.id);
          return { ...profile, friendshipId: friendship!.id };
        });

        setFriends(enriched);

      } catch (error) {
        console.error("Fehler beim Laden der Freundesdetails:", error);
        toast({ variant: 'destructive', title: 'Fehler', description: 'Freundesliste konnte nicht geladen werden.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchFriendDetails();
  }, [friendships1, friendships2, user, firestore, toast]);

  const handleRemoveFriend = async () => {
    if (!friendToRemove || !user || !firestore) return;
    setIsRemoving(true);
    try {
      const friendshipDocRef = doc(firestore, 'friendships', friendToRemove.friendshipId);
      await deleteDoc(friendshipDocRef);
        
      toast({
          title: 'Freund entfernt',
          description: `${friendToRemove.displayName} ist nicht mehr dein Freund.`,
      });
      setFriends(prev => prev.filter(f => f.id !== friendToRemove.id));
      onFriendAction();

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Freund konnte nicht entfernt werden.',
      });
    } finally {
      setIsRemoving(false);
      setFriendToRemove(null);
    }
  };
  
  const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : '');

  if (isLoading) {
    return <div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (friends.length === 0) {
    return <p className="text-center text-muted-foreground">Du hast noch keine Freunde. Finde welche über die Suche!</p>;
  }

  return (
    <div className="space-y-3">
      {friends.map((friend) => (
        <Card
          key={friend.id}
          className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer"
          onClick={() => router.push(`/dashboard/users/${friend.id}`)}
        >
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={friend.photoURL} />
              <AvatarFallback>{getInitials(friend.displayName)}</AvatarFallback>
            </Avatar>
            <p className="font-semibold">{friend.displayName}</p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                        e.stopPropagation();
                        setFriendToRemove(friend);
                    }}
                >
                    <UserX className="mr-2 h-4 w-4" />
                    Freund entfernen
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Card>
      ))}

      <AlertDialog open={!!friendToRemove} onOpenChange={(open) => !open && setFriendToRemove(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Freund entfernen?</AlertDialogTitle>
                <AlertDialogDescription>
                    Bist du sicher, dass du {friendToRemove?.displayName} aus deiner Freundesliste entfernen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemoveFriend} disabled={isRemoving} className="bg-destructive hover:bg-destructive/90">
                    {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entfernen
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
