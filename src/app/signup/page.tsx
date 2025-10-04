'use client';

import Link from 'next/link';
import { useState }from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function SignUpPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: username,
        });
      }
      
      window.location.href = '/dashboard';

    } catch (error: any) {
        let description = 'Ein unbekannter Fehler ist aufgetreten.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                description = 'Diese E-Mail-Adresse wird bereits verwendet.';
                break;
            case 'auth/invalid-email':
                description = 'Die E-Mail-Adresse ist ungültig.';
                break;
            case 'auth/weak-password':
                description = 'Das Passwort ist zu schwach. Es muss mindestens 6 Zeichen lang sein.';
                break;
            default:
                description = 'Bitte versuche es später erneut.';
                break;
        }
      toast({
        variant: 'destructive',
        title: 'Registrierung fehlgeschlagen',
        description: description,
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full shadow-lg">
        <CardHeader className="text-center">
          <Logo className="mx-auto mb-4 text-3xl" />
          <CardTitle className="text-2xl font-headline">Konto erstellen</CardTitle>
          <CardDescription>Gib deine Informationen ein, um ein neues Konto zu erstellen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  placeholder="Dein Benutzername"
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
                 <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="rounded-full pr-10"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
              </div>
              <Button type="submit" className="w-full">
                Konto erstellen
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Hast du bereits ein Konto?{' '}
            <Link href="/" className="underline">
              Anmelden
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
