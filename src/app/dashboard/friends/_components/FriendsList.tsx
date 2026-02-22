'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
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
import type { EnrichedFriendship } from '@/lib/types';

export function FriendsList({ onFriendAction }: { onFriendAction: () => void }) {
  const [friends, setFriends] = useState<EnrichedFriendship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [friendToRemove, setFriendToRemove] = useState<EnrichedFriendship | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const { user } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const response = await fetch('/api/friends?status=accepted');
        if (!response.ok) throw new Error('Failed to fetch friends');
        const data = await response.json();
        setFriends(data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: 'Freunde konnten nicht geladen werden.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchFriends();
  }, [user, toast]);

  const handleRemoveFriend = async () => {
    if (!friendToRemove) return;
    setIsRemoving(true);
    try {
        const response = await fetch(`/api/friends?friendId=${friendToRemove.id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to remove friend');
        
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
