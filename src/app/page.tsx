'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      console.log("LoginPage: handleLogin triggered for user:", username);
      console.log("LoginPage: Browser Online Status:", navigator.onLine ? "ONLINE" : "OFFLINE");
      
      // Basic connectivity test to Google APIs
      try {
        console.log("LoginPage: Connectivity test to Google...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const testResp = await fetch('https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig', {
          method: 'HEAD',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        console.log("LoginPage: Google connectivity test result:", testResp.status);
      } catch (testError) {
        console.warn("LoginPage: Google connectivity test FAILED (non-blocking):", testError);
      }

      const auth = getAuth();
      console.log("LoginPage: Auth instance status:", auth ? "INITIALIZED" : "NOT INITIALIZED");

      // Increase timeout to 60 seconds of patience for very slow mobile connections
      const timeoutMs = 60000;
      const startTime = Date.now();
      
      // Logging interval during wait
      const logInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`LoginPage: Still waiting for signInWithEmailAndPassword... (${elapsed}s elapsed)`);
      }, 10000);

      const loginPromise = signInWithEmailAndPassword(auth, email, password);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
      );

      console.log(`LoginPage: Calling signInWithEmailAndPassword with ${timeoutMs/1000}s timeout...`);
      const userCredential = (await Promise.race([loginPromise, timeoutPromise])) as any;
      clearInterval(logInterval);
      
      console.log("LoginPage: signInWithEmailAndPassword SUCCESS. UID:", userCredential.user?.uid);
      
      const user = userCredential.user;
      if (user) {
        const finalDisplayName = user.displayName || username.trim();
        console.log("LoginPage: User identified:", finalDisplayName);
        
        try {
          const firestore = getFirestore();
          // Don't await setDoc to avoid potential hanging on Firestore connection
          setDoc(doc(firestore, 'publicProfiles', user.uid), {
            displayName: finalDisplayName,
            displayName_lowercase: finalDisplayName.toLowerCase(),
            photoURL: user.photoURL || null,
          }, { merge: true })
          .then(() => console.log("LoginPage: Public profile updated successfully."))
          .catch(err => console.warn("LoginPage: setDoc background update failed:", err));
          
          console.log("LoginPage: Firestore update initiated.");
        } catch (fsError) {
          console.error("LoginPage: Firestore setup failed (non-critical):", fsError);
        }
      }

      console.log("LoginPage: Navigation to /dashboard starting...");
      router.replace('/dashboard');
      console.log("LoginPage: router.replace was called.");
      
    } catch (error: any) {
      console.error("LoginPage: handleLogin ERROR detail:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      let description = 'Bitte versuche es später erneut.';
      if (error.message === 'TIMEOUT') {
        description = 'Die Anmeldung dauert zu lange. Bitte prüfe deine Internetverbindung.';
      } else if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(error.code)) {
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
        <h1 className="text-3xl font-bold font-headline tracking-tight">Vocaro</h1>
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

          {/* Failsafe for hanging login */}
          {isLoading && (
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground animate-pulse mb-2">
                Verbindung zum Server wird hergestellt...
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setIsLoading(false);
                  toast({
                    title: "Ladevorgang abgebrochen",
                    description: "Du kannst es jetzt erneut versuchen.",
                  });
                }}
              >
                Dauert es zu lange? Abbrechen & Erneut versuchen
              </Button>
            </div>
          )}

          {/* Biometric Login Option */}
          <div className="mt-6 flex flex-col items-center">
            <Button
              variant="outline"
              className="w-full gap-2 h-12 border-dashed"
              onClick={async () => {
                const { performBiometricAuth } = await import('@/lib/biometric');
                const success = await performBiometricAuth();
                if (success) {
                  toast({ title: "Erfolgreich", description: "Biometrische Anmeldung erfolgreich. Bitte melde dich einmal normal an, um den Schlüssel zu hinterlegen (Feature in Kürze verfügbar)." });
                } else {
                  toast({ variant: "destructive", title: "Fehler", description: "Keine biometrische Anmeldung möglich." });
                }
              }}
            >
              <div className="w-5 h-5 border-2 border-primary rounded-sm flex items-center justify-center">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              </div>
              Mit Face ID anmelden
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
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
