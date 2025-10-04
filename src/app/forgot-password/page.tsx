'use client';

import Link from "next/link";
import { useState } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getAuth();
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'E-Mail gesendet',
        description: 'Wir haben Ihnen einen Link zum Zurücksetzen Ihres Passworts gesendet. Bitte überprüfen Sie Ihren Posteingang.',
      });
    } catch (error: any) {
      let description = 'Ein unbekannter Fehler ist aufgetreten.';
      switch (error.code) {
        case 'auth/user-not-found':
          description = 'Es wurde kein Konto mit dieser E-Mail-Adresse gefunden.';
          break;
        case 'auth/invalid-email':
          description = 'Die eingegebene E-Mail-Adresse ist ungültig.';
          break;
        default:
          description = 'Bitte versuchen Sie es später erneut.';
          break;
      }
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: description,
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full shadow-lg">
        <CardHeader className="text-center">
          <Logo className="mx-auto mb-4 text-3xl" />
          <CardTitle className="text-2xl font-headline">Passwort vergessen</CardTitle>
          <CardDescription>Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  className="rounded-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Link zum Zurücksetzen senden
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Erinnern Sie sich an Ihr Passwort?{" "}
            <Link href="/" className="underline">
              Anmelden
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
