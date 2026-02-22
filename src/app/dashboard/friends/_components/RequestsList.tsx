'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import type { Friendship, PublicProfile } from '@/lib/types';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';

type EnrichedRequest = PublicProfile & { friendshipId: string };

export function RequestsList({ onFriendAction }: { onFriendAction: () => void }) {
  const { firestore, user } = useFirebase();
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const requestsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'friendships'),
      where('recipientId', '==', user.uid),
      where('status', '==', 'pending')
    );
  }, [user, firestore]);
  const { data: friendshipRequests } = useCollection<Friendship>(requestsQuery);

  useEffect(() => {
    const fetchRequesterDetails = async () => {
      if (!firestore || friendshipRequests === null) {
        setIsLoading(friendshipRequests === null);
        return;
      };
      
      setIsLoading(true);
      const requesterIds = friendshipRequests.map(req => req.requesterId);

      if (requesterIds.length === 0) {
        setRequests([]);
        setIsLoading(false);
        return;
      }
      
      try {
        const profilesRef = collection(firestore, 'publicProfiles');
        const profilesQuery = query(profilesRef, where('__name__', 'in', requesterIds));
        const profilesSnapshot = await getDocs(profilesQuery);
        const profilesData = profilesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PublicProfile));

        const enriched = profilesData.map(profile => {
            const friendship = friendshipRequests.find(req => req.requesterId === profile.id);
            return { ...profile, friendshipId: friendship!.id };
        });

        setRequests(enriched);

      } catch (error) {
        console.error("Fehler beim Laden der Anfragedetails:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequesterDetails();
  }, [friendshipRequests, firestore, toast]);

  const handleRequest = async (request: EnrichedRequest, accept: boolean) => {
    if (!user || !firestore) return;
    setProcessingId(request.id);
    
    const friendshipDocRef = doc(firestore, 'friendships', request.friendshipId);

    try {
      if (accept) {
        await updateDoc(friendshipDocRef, { status: 'accepted' });
        toast({ title: 'Anfrage angenommen' });
      } else {
        await deleteDoc(friendshipDocRef);
        toast({ title: 'Anfrage abgelehnt' });
      }

      setRequests(prev => prev.filter(r => r.id !== request.id));
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
                onClick={() => handleRequest(request, false)}
                disabled={!!processingId}
              >
                {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                onClick={() => handleRequest(request, true)}
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
