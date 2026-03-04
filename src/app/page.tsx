'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const email = `${username.trim()}@vocaro.app`;

    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user) {
        const finalDisplayName = user.displayName || username.trim();
        if (finalDisplayName) {
          const firestore = getFirestore();
          setDoc(doc(firestore, 'publicProfiles', user.uid), {
            displayName: finalDisplayName,
            displayName_lowercase: finalDisplayName.toLowerCase(),
            photoURL: user.photoURL || null,
          }, { merge: true }).catch(console.error);
        }
      }

      router.push('/dashboard');
    } catch (error: any) {
      let description = 'Bitte versuche es später erneut.';
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(error.code)) {
        description = 'Benutzername oder Passwort ist falsch.';
      } else if (error.code === 'auth/invalid-email') {
        description = 'Der Benutzername ist ungültig.';
      }
      toast({ variant: 'destructive', title: 'Anmeldung fehlgeschlagen', description });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal Header */}
      <header className="flex items-center justify-center py-8">
        <Logo className="text-3xl" />
      </header>

      {/* Auth Card */}
      <main className="flex-1 flex items-start justify-center px-4 pt-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold font-headline tracking-tight">Willkommen zurück</h1>
            <p className="text-muted-foreground mt-2 text-sm">Melde dich an, um weiterzulernen</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold">Benutzername</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Dein Benutzername"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Passwort</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-12 text-base pr-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full w-11 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold mt-2" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Anmelden'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Noch kein Konto?{' '}
            <Link href="/signup" className="font-semibold text-foreground hover:underline underline-offset-4">
              Registrieren
            </Link>
          </p>
        </div>
      </main>

      <footer className="text-center text-xs text-muted-foreground py-6">
        <p>© 2026 Vocaro</p>
        <p className="mt-1">
          <Link href="/privacy" className="hover:underline">Datenschutz</Link>
          {' · '}
          <Link href="/terms" className="hover:underline">AGB</Link>
        </p>
      </footer>
    </div>
  );
}
