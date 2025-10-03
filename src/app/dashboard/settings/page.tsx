'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { mockSettings } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirebase } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const settings = mockSettings;
  const { user, isUserLoading } = useFirebase();
  const [font, setFont] = useState('font-body');
  const [enableConfetti, setEnableConfetti] = useState(true);

  useEffect(() => {
    // Load persisted settings on mount
    const persistedFont = localStorage.getItem('app-font') || 'font-body';
    handleFontChange(persistedFont);

    const persistedConfetti = localStorage.getItem('enable-confetti');
    setEnableConfetti(persistedConfetti === null ? true : persistedConfetti === 'true');

  }, []);

  const handleFontChange = (newFont: string) => {
    if (typeof window !== 'undefined') {
        document.body.classList.remove(font);
        document.body.classList.add(newFont);
        localStorage.setItem('app-font', newFont);
    }
    setFont(newFont);
  };

  const handleConfettiChange = (checked: boolean) => {
    setEnableConfetti(checked);
    localStorage.setItem('enable-confetti', String(checked));
  };


  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold font-headline">Einstellungen</h1>
      </div>

      <div className="flex flex-col items-center mb-8">
        {isUserLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-6 w-[150px]" />
          </div>
        ) : user ? (
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? 'Benutzer'} />
              <AvatarFallback className="text-4xl font-bold">
                {getInitials(user.displayName, user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-2xl font-semibold text-center">{user.displayName || 'Benutzer'}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex justify-center">
        <div className="grid gap-8 max-w-2xl w-full">
           <Card>
            <CardHeader>
              <CardTitle>Erscheinungsbild</CardTitle>
              <CardDescription>Passe an, wie Vocaro aussieht.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="font-selection" className="flex flex-col space-y-1">
                  <span>Schriftart</span>
                  <span className="font-normal leading-snug text-muted-foreground">
                    Wähle die primäre Schriftart für die Anwendung.
                  </span>
                </Label>
                <Select
                  value={font}
                  onValueChange={handleFontChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Schriftart auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="font-body" className="font-body">PT Sans</SelectItem>
                    <SelectItem value="font-creative" className="font-creative">Merriweather</SelectItem>
                    <SelectItem value="font-code" className="font-code">Inconsolata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="confetti-mode" className="flex flex-col space-y-1">
                  <span>Sieges-Konfetti</span>
                  <span className="font-normal leading-snug text-muted-foreground">
                    Aktiviere eine Konfetti-Animation für hohe Punktzahlen.
                  </span>
                </Label>
                <Switch id="confetti-mode" checked={enableConfetti} onCheckedChange={handleConfettiChange} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Wiederholung</CardTitle>
              <CardDescription>Verwalte deine Lern- und Wiederholungseinstellungen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="repetition-timeframe" className="flex flex-col space-y-1">
                  <span>Wiederholungszeitraum</span>
                  <span className="font-normal leading-snug text-muted-foreground">
                    Falsch beantwortete Wörter aus diesem Zeitraum einbeziehen.
                  </span>
                </Label>
                <Select defaultValue={settings.quiz.repetitionTimeframe}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Zeitraum auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Letzte 24 Stunden</SelectItem>
                    <SelectItem value="7d">Letzte 7 Tage</SelectItem>
                    <SelectItem value="30d">Letzte 30 Tage</SelectItem>
                    <SelectItem value="all">Gesamte Zeit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
