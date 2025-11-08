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

export function AccountSettings() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const handleDeleteAccount = () => {
    // Logic to delete account would go here
    console.log("Account deletion initiated.");
    setIsDeleteDialogOpen(false);
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
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Konto löschen</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bist du absolut sicher?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion ist endgültig. Dein Konto und alle zugehörigen Daten werden unwiderruflich gelöscht.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount}>
                  Ich verstehe, mein Konto löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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