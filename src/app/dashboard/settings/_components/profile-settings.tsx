'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { getAuth, updateProfile, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Eye, EyeOff, Check, X } from 'lucide-react';
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
  
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);


  const getInitials = (name: string | null | undefined) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const handleUsernameChange = async () => {
    if (!user || !newUsername.trim() || newUsername.trim() === user.displayName) {
      setIsEditingUsername(false);
      return;
    }

    try {
      await updateProfile(user, { displayName: newUsername.trim() });
      toast({ title: "Erfolg", description: "Benutzername aktualisiert." });
      setIsEditingUsername(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fehler", description: "Benutzername konnte nicht geändert werden." });
    }
  };

  const handlePasswordChange = async () => {
    if (!user || !user.email || !currentPassword || !newPassword) {
      toast({ variant: "destructive", title: "Fehler", description: "Bitte fülle alle Felder aus." });
      return;
    }
  
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      toast({ title: "Erfolg", description: "Passwort erfolgreich geändert." });
      setIsEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      let message = "Ein Fehler ist aufgetreten.";
      if(error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Das aktuelle Passwort ist falsch."
      } else if (error.code === 'auth/weak-password') {
        message = "Das neue Passwort ist zu schwach."
      }
      toast({ variant: "destructive", title: "Passwortänderung fehlgeschlagen", description: message });
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


  return (
    <SectionShell title="Profil" description="Verwalte deine persönlichen Informationen.">
        <div className="flex flex-col items-center gap-4">
            {isUserLoading ? (
                <>
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-8 w-[200px]" />
                    <Skeleton className="h-10 w-[250px]" />
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

              <div className="flex items-center gap-2">
                {!isEditingUsername ? (
                  <>
                    <h2 className="text-2xl font-bold text-center">{user.displayName || 'Benutzer'}</h2>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setNewUsername(user.displayName || ''); setIsEditingUsername(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} className="text-lg h-10" autoFocus onKeyDown={e => e.key === 'Enter' && handleUsernameChange()} />
                    <Button variant="ghost" size="icon" onClick={handleUsernameChange}><Check className="h-5 w-5"/></Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditingUsername(false)}><X className="h-5 w-5"/></Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                 {!isEditingPassword ? (
                    <>
                        <span className="text-muted-foreground">Passwort: ••••••••</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditingPassword(true)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </>
                 ) : (
                    <div className="flex flex-col gap-2 items-center">
                        <Input type="password" placeholder="Aktuelles Passwort" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="h-9"/>
                        <Input type="password" placeholder="Neues Passwort" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-9"/>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={handlePasswordChange}>Speichern</Button>
                            <Button variant="ghost" size="sm" onClick={() => setIsEditingPassword(false)}>Abbrechen</Button>
                        </div>
                    </div>
                 )}
              </div>
            </>
          ) : null}
        </div>
    </SectionShell>
  );
}