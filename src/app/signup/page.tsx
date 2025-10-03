'use client';

import Link from 'next/link';
import { useState }from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';

export default function SignUpPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      console.error("Auth service is not available.");
      toast({
        variant: 'destructive',
        title: 'Registrierung fehlgeschlagen',
        description: 'Authentifizierungsdienst nicht verfügbar.',
      });
      return;
    }
    // Simple validation for case-insensitivity would be ideally checked against the DB
    // This is a placeholder for more complex logic
    if (username.toLowerCase() === 'existinguser') {
         toast({
            variant: 'destructive',
            title: 'Benutzername bereits vergeben',
            description: 'Bitte wählen Sie einen anderen Benutzernamen.',
         });
         return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // You might want to update the user's profile with the username here
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registrierung fehlgeschlagen',
        description: error.message,
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full shadow-lg">
        <CardHeader className="text-center">
          <Logo className="mx-auto mb-4 text-3xl" />
          <CardTitle className="text-2xl font-headline">Konto erstellen</CardTitle>
          <CardDescription>Geben Sie Ihre Informationen ein, um ein neues Konto zu erstellen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  placeholder="Ihr Name"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-full"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-full"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-full"
                />
              </div>
              <Button type="submit" className="w-full">
                Konto erstellen
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Haben Sie bereits ein Konto?{' '}
            <Link href="/" className="underline">
              Anmelden
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
