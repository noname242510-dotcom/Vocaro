'use client';

import { useState } from 'react';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { SectionShell } from './section-shell';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { PasswordDialog } from './password-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function AccountSettings() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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

  const handlePasswordChange = async () => {
    if (!user || !currentPassword || !newPassword) {
      setPasswordError("Bitte fülle alle Felder aus.");
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordError(null);

    try {
      const token = await user.getIdToken(true);
      const response = await fetch('/api/user/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const result = await response.json();

      if (!response.ok) {
        setPasswordError(result.error);
        throw new Error(result.error);
      } else {
        toast({ title: "Erfolg", description: "Dein Passwort wurde erfolgreich geändert." });
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (error: any) {
       toast({ variant: "destructive", title: "Fehler", description: error.message || "Ein unerwarteter Fehler ist aufgetreten." });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <SectionShell title="Konto & Datenschutz" description="Verwalte deine Kontoinformationen und Datenschutzeinstellungen.">
      {hasPasswordProvider && (
        <Card>
          <CardHeader>
            <CardTitle>Passwort ändern</CardTitle>
            <CardDescription>
              Hier kannst du ein neues Passwort für dein Konto festlegen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Dein aktuelles Passwort"
                  className={cn(passwordError && "border-destructive focus-visible:ring-destructive")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                  onClick={() => setShowCurrentPassword((p) => !p)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Neues Passwort</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mindestens 6 Zeichen"
                  className={cn(passwordError && "border-destructive focus-visible:ring-destructive")}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordChange()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                  onClick={() => setShowNewPassword((p) => !p)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {passwordError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <p>{passwordError}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handlePasswordChange} disabled={isUpdatingPassword || !currentPassword || !newPassword}>
              {isUpdatingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Passwort speichern
            </Button>
          </CardFooter>
        </Card>
      )}

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Konto löschen</CardTitle>
          <CardDescription>
            Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten, einschließlich Fächer, Vokabeln und Lernfortschritte, werden dauerhaft gelöscht.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={handleDeleteAccount}
            isUpdating={isUpdating}
            title="Bist du absolut sicher?"
            description="Diese Aktion ist endgültig. Dein Konto und alle zugehörigen Daten werden unwiderruflich gelöscht. Gib zur Bestätigung dein Passwort ein."
            showPasswordField={hasPasswordProvider}
            actionButtonText="Konto endgültig löschen"
            actionButtonVariant="destructive"
          />
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>Konto löschen</Button>
        </CardContent>
      </Card>
      <div className="text-center mt-8">
        <p className="text-sm text-muted-foreground">
          <Link href="/privacy" className="underline">Datenschutzerklärung</Link> · <Link href="/terms" className="underline">Nutzungsbedingungen</Link>
        </p>
      </div>
    </SectionShell>
  );
}
