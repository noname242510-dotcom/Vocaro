'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, Loader2, UserPlus, Clock } from 'lucide-react';
import type { PublicProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import debounce from 'lodash.debounce';

export function UserSearch({ onFriendAction }: { onFriendAction: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useFirebase();

  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.trim().length < 1) {
        setResults([]);
        return;
      }
      if (!user) return;

      setIsLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setResults(data.filter((p: PublicProfile) => p.id !== user?.uid));
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Fehler bei der Suche',
          description: 'Benutzer konnten nicht geladen werden.',
        });
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [toast, user]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    debouncedSearch(newQuery);
  };

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
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Nach Benutzernamen suchen..."
          value={query}
          onChange={handleSearchChange}
          className="pl-10 h-12 text-lg rounded-full"
        />
      </div>

      {isLoading && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
      
      {!isLoading && query.length > 0 && results.length === 0 && (
        <p className="text-center text-muted-foreground">Keine Benutzer gefunden.</p>
      )}

      <div className="space-y-3">
        {results.map((profile) => (
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
