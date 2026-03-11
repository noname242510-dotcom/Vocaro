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
      const profilesData: PublicProfile[] = [];

      try {
        const profilesRef = collection(firestore, 'publicProfiles');

        // Chunk the friend IDs to stay within Firestore's 'in' query limit (30)
        const CHUNK_SIZE = 30;
        for (let i = 0; i < uniqueFriendIds.length; i += CHUNK_SIZE) {
          const chunk = uniqueFriendIds.slice(i, i + CHUNK_SIZE);
          if (chunk.length > 0) {
            const profilesQuery = query(profilesRef, where('__name__', 'in', chunk));
            const profilesSnapshot = await getDocs(profilesQuery);
            profilesSnapshot.docs.forEach(doc => {
              profilesData.push({ ...doc.data(), id: doc.id } as PublicProfile);
            });
          }
        }

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {friends.map((friend) => (
        <Card
          key={friend.id}
          className="group relative bg-white border-none shadow-xl shadow-primary/5 rounded-3xl p-6 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col items-center text-center space-y-4"
          onClick={() => router.push(`/dashboard/users/${friend.id}`)}
        >
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-secondary shadow-lg">
              <AvatarImage src={friend.photoURL} />
              <AvatarFallback className="text-2xl font-bold bg-primary text-white">{getInitials(friend.displayName)}</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-1 right-1 h-5 w-5 bg-green-500 border-4 border-white rounded-full"></div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold font-headline tracking-tight group-hover:text-primary transition-colors">{friend.displayName}</h3>
            <p className="text-muted-foreground text-sm font-medium">Flashcard Enthusiast</p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="secondary" size="sm" className="rounded-xl font-bold">Profil</Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-secondary" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive rounded-xl p-3 font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFriendToRemove(friend);
                  }}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Entfernen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
