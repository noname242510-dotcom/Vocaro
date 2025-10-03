import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

export default function ForgotPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full shadow-lg">
        <CardHeader className="text-center">
          <Logo className="mx-auto mb-4 text-3xl" />
          <CardTitle className="text-2xl font-headline">Passwort vergessen</CardTitle>
          <CardDescription>Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required className="rounded-full" />
            </div>
            <Button type="submit" className="w-full">
              Link zum Zurücksetzen senden
            </Button>
          </div>
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
