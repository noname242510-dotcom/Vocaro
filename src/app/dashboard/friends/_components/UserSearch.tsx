'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, UserPlus, Clock, UserCheck } from 'lucide-react';
import type { PublicProfile, Friendship } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function UserSearch({ onFriendAction }: { onFriendAction: () => void }) {
  const [friendshipStatus, setFriendshipStatus] = useState<Record<string, 'pending' | 'accepted'>>({});
  const { toast } = useToast();
  const { user, firestore } = useFirebase();

  const usersCollectionQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'publicProfiles');
  }, [firestore]);
  const { data: users, isLoading } = useCollection<PublicProfile>(usersCollectionQuery);

  const sentRequestsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'friendships'), where('requesterId', '==', user.uid));
  }, [firestore, user]);
  const { data: sentRequests } = useCollection<Friendship>(sentRequestsQuery);
  
  const receivedRequestsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'friendships'), where('recipientId', '==', user.uid));
  }, [firestore, user]);
  const { data: receivedRequests } = useCollection<Friendship>(receivedRequestsQuery);

  useEffect(() => {
      const statusMap: Record<string, 'pending' | 'accepted'> = {};
      const allFriendships = [...(sentRequests || []), ...(receivedRequests || [])];
      
      allFriendships.forEach(fs => {
        const otherUserId = fs.requesterId === user?.uid ? fs.recipientId : fs.requesterId;
        statusMap[otherUserId] = fs.status;
      });

      setFriendshipStatus(statusMap);
  }, [sentRequests, receivedRequests, user]);


  const filteredUsers = useMemo(() => {
    if (!users || !user) return [];
    return users.filter((p) => p.id !== user.uid);
  }, [users, user]);


  const handleAddFriend = async (recipientId: string) => {
    if (!user || !firestore) return;
    
    try {
        const friendshipId = [user.uid, recipientId].sort().join('_');
        const friendshipRef = doc(firestore, 'friendships', friendshipId);
        
        await setDoc(friendshipRef, {
            requesterId: user.uid,
            recipientId: recipientId,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
      
      toast({
        title: 'Anfrage gesendet',
        description: 'Deine Freundschaftsanfrage wurde erfolgreich versendet.',
      });
      onFriendAction();

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message || 'Die Anfrage konnte nicht gesendet werden.',
      });
    }
  };

  const getButtonState = (profileId: string) => {
      const status = friendshipStatus[profileId];
      if (status === 'accepted') {
          return { text: 'Freunde', icon: UserCheck, disabled: true };
      }
      if (status === 'pending') {
          return { text: 'Angefragt', icon: Clock, disabled: true };
      }
      return { text: 'Hinzufügen', icon: UserPlus, disabled: false };
  }

  const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : '');

  return (
    <div>
      {isLoading && <div className="text-center py-10"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}
      
      {!isLoading && filteredUsers.length === 0 && (
        <p className="text-center text-muted-foreground py-10">Keine anderen Benutzer gefunden.</p>
      )}

      <div className="space-y-3">
        {!isLoading && filteredUsers.map((profile) => {
          const { text, icon: Icon, disabled } = getButtonState(profile.id);
          return (
            <Card key={profile.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={profile.photoURL} />
                    <AvatarFallback>{getInitials(profile.displayName)}</AvatarFallback>
                  </Avatar>
                  <p className="font-semibold">{profile.displayName}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAddFriend(profile.id)}
                  disabled={disabled}
                >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{text}</span>
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
