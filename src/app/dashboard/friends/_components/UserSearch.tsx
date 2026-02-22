'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, UserPlus, Clock } from 'lucide-react';
import type { PublicProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection } from 'firebase/firestore';


export function UserSearch({ onFriendAction }: { onFriendAction: () => void }) {
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user, firestore } = useFirebase();

  const usersCollectionQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'publicProfiles');
  }, [firestore]);

  const { data: users, isLoading } = useCollection<PublicProfile>(usersCollectionQuery);

  const filteredUsers = useMemo(() => {
    if (!users || !user) return [];
    return users.filter((p) => p.id !== user.uid);
  }, [users, user]);


  const handleAddFriend = async (recipientId: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ recipientId }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Anfrage fehlgeschlagen.');
      }
      
      toast({
        title: 'Anfrage gesendet',
        description: 'Deine Freundschaftsanfrage wurde erfolgreich versendet.',
      });
      setSentRequests(prev => new Set(prev).add(recipientId));
      onFriendAction();

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message || 'Die Anfrage konnte nicht gesendet werden.',
      });
    }
  };

  const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : '');

  return (
    <div>
      {isLoading && <div className="text-center py-10"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}
      
      {!isLoading && filteredUsers.length === 0 && (
        <p className="text-center text-muted-foreground py-10">Keine anderen Benutzer gefunden.</p>
      )}

      <div className="space-y-3">
        {!isLoading && filteredUsers.map((profile) => (
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
                disabled={sentRequests.has(profile.id)}
              >
                {sentRequests.has(profile.id) ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    <span>Angefragt</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Hinzufügen</span>
                  </>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
