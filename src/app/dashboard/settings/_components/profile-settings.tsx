'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { SectionShell } from './section-shell';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import Image from 'next/image';
import { cn } from '@/lib/utils';


const presetAvatars = [
    '/avatars/avatar-1.svg',
    '/avatars/avatar-2.svg',
    '/avatars/avatar-3.svg',
    '/avatars/avatar-4.svg',
    '/avatars/avatar-5.svg',
    '/avatars/avatar-6.svg',
];

export function ProfileSettings() {
  const { user, isUserLoading } = useFirebase();
  const { toast } = useToast();

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.displayName || '');
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);


  useEffect(() => {
    if (user) {
      setNewUsername(user.displayName || '');
    }
  }, [user]);

  const getInitials = (name: string | null | undefined) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const handleUsernameChange = async () => {
    if (!user || !newUsername.trim() || newUsername.trim() === user.displayName) {
      setIsEditingUsername(false);
      setUsernameError(null);
      return;
    }

    setIsUpdating(true);
    setUsernameError(null);

    try {
        const token = await user.getIdToken();
        const response = await fetch('/api/user/update-username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newUsername: newUsername.trim() })
        });
        
        const result = await response.json();

        if (!response.ok) {
            if (response.status === 409) {
                setUsernameError(result.error);
            } else {
                 throw new Error(result.error || 'Ein Fehler ist aufgetreten.');
            }
        } else {
            await updateProfile(user, { displayName: newUsername.trim() });
            toast({ title: "Erfolg", description: "Benutzername erfolgreich aktualisiert." });
            setIsEditingUsername(false);
        }

    } catch (error: any) {
      toast({ variant: "destructive", title: "Fehler", description: error.message || "Benutzername konnte nicht geändert werden." });
    } finally {
        setIsUpdating(false);
    }
  };


  const handleAvatarSelect = async (avatarUrl: string) => {
    if (!user) return;
    try {
        await updateProfile(user, { photoURL: avatarUrl });
        toast({ title: "Profilbild aktualisiert" });
        setIsAvatarDialogOpen(false);
    } catch (error) {
        toast({ variant: "destructive", title: "Fehler", description: "Profilbild konnte nicht geändert werden." });
    }
  };
  
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);


  return (
    <SectionShell title="Profil" description="Verwalte deine persönlichen Informationen.">
        <div className="flex flex-col items-center gap-4">
            {isUserLoading ? (
                <>
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-8 w-[200px]" />
                </>
            ) : user ? (
            <>
                <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                    <DialogTrigger asChild>
                        <button className="relative group">
                            <Avatar className="h-24 w-24 border-2 border-border group-hover:border-primary transition-colors">
                                <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? 'Benutzer'} />
                                <AvatarFallback className="text-4xl font-bold">
                                {getInitials(user.displayName)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <Pencil className="h-8 w-8 text-white" />
                            </div>
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Profilbild auswählen</DialogTitle>
                            <DialogDescription>Wähle einen neuen Avatar aus der Liste aus.</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-3 gap-4 py-4">
                            {presetAvatars.map(url => (
                                <button key={url} onClick={() => handleAvatarSelect(url)} className="p-2 rounded-full hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring">
                                    <Image src={url} alt="Avatar" width={80} height={80} className="rounded-full" />
                                </button>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>

              <div className="flex flex-col items-center gap-2">
                {!isEditingUsername ? (
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-center">{user.displayName || 'Benutzer'}</h2>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setNewUsername(user.displayName || ''); setUsernameError(null); setIsEditingUsername(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                    <div className="flex items-center gap-2 w-full">
                        <Input 
                            value={newUsername} 
                            onChange={e => setNewUsername(e.target.value)} 
                            className={cn("text-lg h-10 text-center", usernameError && "border-destructive focus-visible:ring-destructive")}
                            autoFocus 
                            onKeyDown={e => e.key === 'Enter' && handleUsernameChange()}
                        />
                        <Button variant="ghost" size="icon" onClick={handleUsernameChange} disabled={isUpdating || newUsername.trim() === user.displayName || !newUsername.trim()}>
                            {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5"/>}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {setIsEditingUsername(false); setUsernameError(null);}}><X className="h-5 w-5"/></Button>
                    </div>
                     {usernameError && (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <p>{usernameError}</p>
                        </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
    </SectionShell>
  );
}
