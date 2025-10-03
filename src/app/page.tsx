import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
          <Logo className="mx-auto mb-4" />
          <CardTitle className="text-2xl font-headline">Willkommen bei Vocaro</CardTitle>
          <CardDescription>Geben Sie Ihre E-Mail-Adresse unten ein, um sich bei Ihrem Konto anzumelden</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Passwort</Label>
                <Link href="/forgot-password" className="ml-auto inline-block text-sm underline">
                  Passwort vergessen?
                </Link>
              </div>
              <Input id="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              Anmelden
            </Button>
            <Button variant="outline" className="w-full">
              Mit Google anmelden
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            Sie haben noch kein Konto?{" "}
            <Link href="/signup" className="underline">
              Registrieren
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
