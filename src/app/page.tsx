
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Fingerprint, Sun, Moon } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDarkMode(!isDarkMode);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a dummy email from the username
    const email = `${username.trim()}@vocaro.app`;

    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error: any) {
      let description = 'Ein unbekannter Fehler ist aufgetreten.';
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          description = 'Benutzername oder Passwort ist falsch.';
          break;
        case 'auth/invalid-email':
          description = 'Der Benutzername ist ungültig.';
          break;
        default:
          description = 'Bitte versuche es später erneut.';
          break;
      }
      toast({
        variant: 'destructive',
        title: 'Anmeldung fehlgeschlagen',
        description: description,
      });
    }
  };

  const handlePasskeyLogin = async () => {
    try {
        const usernameQuery = username ? `?username=${encodeURIComponent(username)}` : '';
        const responseOptions = await fetch(`/api/passkey/generate-authentication-options${usernameQuery}`);
        
        if (!responseOptions.ok) {
            const errorBody = await responseOptions.json().catch(() => ({error: 'Anmeldeoptionen konnten nicht vom Server geladen werden.'}));
            throw new Error(errorBody.error);
        }
        const options = await responseOptions.json();

        const authenticationResponse = await startAuthentication(options);
        
        const responseVerification = await fetch('/api/passkey/verify-authentication', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              ...authenticationResponse,
              challengeId: options.challengeId, // Send back the challengeId received from the server
            }),
        });

        if (!responseVerification.ok) {
          const errorBody = await responseVerification.json().catch(() => ({ error: 'Anmelde-Verifizierung fehlgeschlagen.' }));
          throw new Error(errorBody.error);
        }

        const { verified, customToken } = await responseVerification.json();
        
        if (verified && customToken) {
            const auth = getAuth();
            await signInWithCustomToken(auth, customToken);
            router.push('/dashboard');
        } else {
            throw new Error('Anmelde-Verifizierung fehlgeschlagen.');
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Passkey-Anmeldung fehlgeschlagen',
            description: error.message || 'Ein unbekannter Fehler ist aufgetreten.'
        });
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-background">
      <header className="absolute top-4 z-10 w-full px-4 md:px-6">
          <div className="flex justify-start">
              {mounted && (
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              )}
          </div>
      </header>
      <main className="w-full max-w-sm px-4">
        <Card className="mx-auto w-full shadow-lg">
          <CardHeader className="text-center">
            <Logo className="mx-auto mb-4 text-3xl" />
            <CardTitle className="text-2xl font-headline">Willkommen zurück</CardTitle>
            <CardDescription>Melde dich bei deinem Konto an, um fortzufahren</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">Benutzername</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Dein Benutzername"
                    required
                    className="rounded-full"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="username"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Passwort</Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="rounded-full pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
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
                  Anmelden
                </Button>
              </div>
            </form>
            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Oder</span>
                </div>
            </div>
             <Button variant="outline" className="w-full" onClick={handlePasskeyLogin}>
                <Fingerprint className="mr-2 h-4 w-4" />
                Mit Passkey anmelden
            </Button>
            <div className="mt-4 text-center text-sm">
              Du hast noch kein Konto?{" "}
              <Link href="/signup" className="underline">
                Registrieren
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
      <footer className="w-full text-center text-xs text-muted-foreground p-6">
        <p>© 2025 Vocaro. Entwickelt mit ♥ und KI-Unterstützung für moderne Sprachlernende.</p>
        <p>Bald auch als App verfügbar.</p>
      </footer>
    </div>
  );
}
