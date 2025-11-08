'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionShell } from './section-shell';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { PasswordDialog } from './password-dialog';

export function AccountSettings() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const hasPasswordProvider = user?.providerData.some(p => p.providerId === 'password');

  const handleDeleteAccount = async (password?: string) => {
    if (!user) return;
    
    if (hasPasswordProvider && !password) {
        toast({ variant: "destructive", title: "Fehler", description: "Passwort ist erforderlich."});
        return;
    }

    setIsUpdating(true);

    try {
        const token = await user.getIdToken();
        const response = await fetch('/api/user/delete-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            // Sende das Passwort nur, wenn es vorhanden ist
            body: JSON.stringify({ password: password ?? null })
        });
        
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Ein Fehler ist aufgetreten.');
        }
        
        toast({ title: "Konto gelöscht", description: "Dein Konto wird in Kürze endgültig gelöscht." });
        router.push('/');

    } catch (error: any) {
        toast({ variant: "destructive", title: "Fehler", description: error.message || "Dein Konto konnte nicht gelöscht werden." });
    } finally {
        setIsUpdating(false);
        setIsDeleteDialogOpen(false);
    }
  };

  return (
    <SectionShell title="Konto & Datenschutz" description="Verwalte deine Kontoinformationen und Datenschutzeinstellungen.">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Konto löschen</CardTitle>
          <CardDescription>
            Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten, einschließlich Fächer, Vokabeln und Lernfortschritte, werden dauerhaft gelöscht.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>Konto löschen</Button>
           {hasPasswordProvider ? (
                <PasswordDialog
                    isOpen={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                    onConfirm={handleDeleteAccount}
                    isUpdating={isUpdating}
                    title="Bist du absolut sicher?"
                    description="Diese Aktion ist endgültig. Dein Konto und alle zugehörigen Daten werden unwiderruflich gelöscht. Gib zur Bestätigung dein Passwort ein."
                />
           ) : (
             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Bist du absolut sicher?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Diese Aktion ist endgültig. Dein Konto und alle zugehörigen Daten werden unwiderruflich gelöscht.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteAccount()}>Konto löschen</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
             </AlertDialog>
           )}
        </CardContent>
      </Card>
      <div className="text-center mt-8">
        <p className="text-sm text-muted-foreground">
          <a href="#" className="underline">Datenschutzerklärung</a> · <a href="#" className="underline">Nutzungsbedingungen</a>
        </p>
      </div>
    </SectionShell>
  );
}
