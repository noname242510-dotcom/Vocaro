'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function SignUpPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore: firestoreInstance } = useFirebase();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) return;

    setIsLoading(true);
    const email = `${trimmedUsername}@vocaro.app`;

    try {
      console.log('Checking username availability...');
      try {
        const profilesRef = collection(firestoreInstance, 'publicProfiles');
        const q = query(profilesRef, where('displayName_lowercase', '==', trimmedUsername.toLowerCase()));
        const existing = await getDocs(q);

        if (!existing.empty) {
          toast({
            variant: 'destructive',
            title: 'Benutzername vergeben',
            description: 'Dieser Benutzername ist bereits vergeben. Bitte wähle einen anderen.',
          });
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.warn('Username check failed (likely permissions), proceeding:', error);
      }

      console.log('Proceeding to Auth creation for:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Auth user created successfully');

      if (userCredential.user) {
        const user = userCredential.user;
        console.log('Updating profile display name...');
        await updateProfile(user, { displayName: trimmedUsername });
        
        console.log('Creating Firestore public profile document (with timeout)...');
        try {
          // Use a timeout to prevent hanging if Firestore rules or connection issues persist
          await Promise.race([
            setDoc(doc(firestoreInstance, 'publicProfiles', user.uid), {
              displayName: trimmedUsername,
              displayName_lowercase: trimmedUsername.toLowerCase(),
              photoURL: user.photoURL || null,
              createdAt: serverTimestamp(),
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore operation timed out')), 3000))
          ]);
          console.log('Firestore profile created successfully');
        } catch (fsError: any) {
          console.error('Error creating public profile document (or timed out):', fsError);
          // We don't block the whole process if this fails, but it's important
        }
      }

      console.log('Redirecting to dashboard...');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Registration error detail:', error);
      let description = 'Bitte versuche es später erneut.';
      if (error.code === 'auth/email-already-in-use') description = 'Dieser Benutzername ist bereits vergeben.';
      else if (error.code === 'auth/invalid-email') description = 'Der Benutzername ist ungültig. Bitte vermeide Sonderzeichen.';
      else if (error.code === 'auth/weak-password') description = 'Das Passwort ist zu schwach (min. 6 Zeichen).';

      toast({ variant: 'destructive', title: 'Registrierung fehlgeschlagen', description });
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
            <h1 className="text-3xl font-bold font-headline tracking-tight">Konto erstellen</h1>
            <p className="text-muted-foreground mt-2 text-sm">Starte deine Lernreise mit Vocaro</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold">Benutzername</Label>
              <Input
                id="username"
                name="username"
                placeholder="Wähle einen Benutzernamen"
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
                  name="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-12 text-base pr-11"
                  placeholder="Mindestens 6 Zeichen"
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
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Konto erstellen'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Bereits ein Konto?{' '}
            <Link href="/" className="font-semibold text-foreground hover:underline underline-offset-4">
              Anmelden
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
