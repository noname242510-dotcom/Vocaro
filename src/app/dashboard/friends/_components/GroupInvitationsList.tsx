'use client';

import { useState } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, doc, query, where, writeBatch, arrayUnion, increment, deleteDoc } from 'firebase/firestore';
import type { GroupInvitation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Check, X } from 'lucide-react';

export function GroupInvitationsList({ onAction }: { onAction: () => void }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const invitationsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'groupInvitations'),
      where('recipientId', '==', user.uid),
      where('status', '==', 'pending')
    );
  }, [user, firestore]);

  const { data: invitations, isLoading } = useCollection<GroupInvitation>(invitationsQuery);

  const handleInvitation = async (invitation: GroupInvitation, accept: boolean) => {
    if (!user || !firestore) return;
    setProcessingId(invitation.id);

    const invitationRef = doc(firestore, 'groupInvitations', invitation.id);
    
    try {
      if (accept) {
        const groupRef = doc(firestore, 'groups', invitation.groupId);
        const batch = writeBatch(firestore);
        
        // Add user to group's memberIds and increment count
        batch.update(groupRef, {
          memberIds: arrayUnion(user.uid),
          memberCount: increment(1)
        });
        
        // Delete invitation
        batch.delete(invitationRef);
        
        await batch.commit();

        toast({ title: 'Einladung angenommen', description: `Du bist jetzt Mitglied bei "${invitation.groupName}".` });
      } else {
        await deleteDoc(invitationRef);
        toast({ title: 'Einladung abgelehnt' });
      }
      onAction(); // This will trigger a re-fetch in parent components
    } catch (error) {
      console.error("Error handling invitation: ", error);
      toast({ variant: 'destructive', title: 'Fehler', description: 'Aktion konnte nicht ausgeführt werden.' });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!invitations || invitations.length === 0) {
    return <p className="text-center text-muted-foreground text-sm p-4">Keine offenen Gruppeneinladungen.</p>;
  }

  return (
    <div className="space-y-3">
      {invitations.map((invitation) => (
        <Card key={invitation.id} className="p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm">
              <span className="font-semibold">{invitation.inviterName}</span> hat dich zu <span className="font-semibold">{invitation.groupName}</span> eingeladen.
            </p>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => handleInvitation(invitation, false)}
                disabled={!!processingId}
              >
                {processingId === invitation.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                className="h-8 w-8"
                onClick={() => handleInvitation(invitation, true)}
                disabled={!!processingId}
              >
                {processingId === invitation.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
