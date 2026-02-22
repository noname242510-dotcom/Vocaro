'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, UserPlus, Clock } from 'lucide-react';
import type { PublicProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';

export function UserSearch({ onFriendAction }: { onFriendAction: () => void }) {
  const [users, setUsers] = useState<PublicProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useFirebase();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/users/search`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setUsers(data.filter((p: PublicProfile) => p.id !== user?.uid));
      } catch (error) {
        console.error("Fehler beim Laden der Benutzer:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [user]);

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
      
      {!isLoading && users.length === 0 && (
        <p className="text-center text-muted-foreground py-10">Keine anderen Benutzer gefunden.</p>
      )}

      <div className="space-y-3">
        {!isLoading && users.map((profile) => (
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
