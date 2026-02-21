
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
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';

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
      router.push('/dashboard/overview');
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

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-background">
      <header className="sticky top-4 z-30 flex justify-between items-center h-20 px-4 md:px-6 m-2 md:m-4 rounded-full glass-effect shadow-md w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] max-w-7xl">
        <div className="flex-1">
          {mounted && (
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}
        </div>
        <div className="flex-1 text-center">
          <Logo className="text-3xl" />
        </div>
        <div className="flex-1 flex justify-end">
          {/* Placeholder for layout consistency */}
        </div>
      </header>

      <main className="w-full max-w-sm px-4 flex-grow flex items-center">
        <Card className="mx-auto w-full shadow-lg">
          <CardHeader className="text-center">
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
        <p>© 2026 Vocaro. Entwickelt mit ♥ und KI-Unterstützung für moderne Sprachlernende.</p>
        <p>
          <Link href="/privacy" className="underline">Datenschutz</Link> · <Link href="/terms" className="underline">AGB</Link>
        </p>
      </footer>
    </div>
  );
}
