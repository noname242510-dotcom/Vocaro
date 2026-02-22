'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import type { EnrichedFriendship } from '@/lib/types';

export function RequestsList({ onFriendAction }: { onFriendAction: () => void }) {
  const [requests, setRequests] = useState<EnrichedFriendship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { user } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/friends?status=pending', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch requests');
        const data = await response.json();
        setRequests(data);
      } catch (error) {
        console.error('Fehler beim Laden der Anfragen:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

  const handleRequest = async (requesterId: string, accept: boolean) => {
    if (!user) return;
    setProcessingId(requesterId);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/friends', {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requesterId, status: accept ? 'accepted' : 'declined' }),
      });
      if (!response.ok) throw new Error(`Failed to ${accept ? 'accept' : 'decline'} request`);
      
      toast({
        title: accept ? 'Anfrage angenommen' : 'Anfrage abgelehnt',
      });
      setRequests(prev => prev.filter(r => r.id !== requesterId));
      onFriendAction(); // Notify parent to refresh other components

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Die Anfrage konnte nicht bearbeitet werden.',
      });
    } finally {
      setProcessingId(null);
    }
  };
  
  const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : '');

  if (isLoading) {
    return <div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (requests.length === 0) {
    return <p className="text-center text-muted-foreground">Keine offenen Freundschaftsanfragen.</p>;
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Card key={request.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={request.photoURL} />
                <AvatarFallback>{getInitials(request.displayName)}</AvatarFallback>
              </Avatar>
              <p><span className="font-semibold">{request.displayName}</span> möchte dein Freund sein.</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleRequest(request.id, false)}
                disabled={!!processingId}
              >
                {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                onClick={() => handleRequest(request.id, true)}
                disabled={!!processingId}
              >
                {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
