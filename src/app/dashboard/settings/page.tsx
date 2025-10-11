
'use client';

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirebase } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user, isUserLoading } = useFirebase();
  const router = useRouter();
  const [font, setFont] = useState('font-body');
  const [enableConfetti, setEnableConfetti] = useState(true);
  const [queryDirectionOverview, setQueryDirectionOverview] = useState(false); // false: term first, true: definition first
  const [queryDirectionFlashcards, setQueryDirectionFlashcards] = useState(false); // false: term first, true: definition first
  const [showHints, setShowHints] = useState(true);

  useEffect(() => {
    // Load persisted settings on mount
    const persistedFont = localStorage.getItem('app-font') || 'font-body';
    handleFontChange(persistedFont);

    const persistedConfetti = localStorage.getItem('enable-confetti');
    setEnableConfetti(persistedConfetti === null ? true : persistedConfetti === 'true');
    
    const persistedQueryDirectionOverview = localStorage.getItem('query-direction-overview');
    setQueryDirectionOverview(persistedQueryDirectionOverview === 'true');

    const persistedQueryDirectionFlashcards = localStorage.getItem('query-direction-flashcards');
    setQueryDirectionFlashcards(persistedQueryDirectionFlashcards === 'true');

    const persistedShowHints = localStorage.getItem('show-hints');
    setShowHints(persistedShowHints === null ? true : persistedShowHints === 'true');


  }, []);

  const handleFontChange = (newFont: string) => {
    if (typeof window !== 'undefined') {
        document.body.classList.remove('font-body', 'font-creative', 'font-code');
        document.body.classList.add(newFont);
        localStorage.setItem('app-font', newFont);
    }
    setFont(newFont);
  };

  const handleConfettiChange = (checked: boolean) => {
    setEnableConfetti(checked);
    localStorage.setItem('enable-confetti', String(checked));
  };
  
  const handleQueryDirectionOverviewChange = (checked: boolean) => {
    setQueryDirectionOverview(checked);
    localStorage.setItem('query-direction-overview', String(checked));
  };

  const handleQueryDirectionFlashcardsChange = (checked: boolean) => {
    setQueryDirectionFlashcards(checked);
    localStorage.setItem('query-direction-flashcards', String(checked));
  };
  
  const handleShowHintsChange = (checked: boolean) => {
    setShowHints(checked);
    localStorage.setItem('show-hints', String(checked));
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Zurück</span>
        </Button>
        <h1 className="text-3xl font-bold font-headline">Einstellungen</h1>
        <div className="w-10"></div> {/* Placeholder to balance the flex layout */}
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
                <Label htmlFor="confetti-mode">
                  <span>Konfetti bei Erfolg</span>
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">aus</span>
                  <Switch id="confetti-mode" checked={enableConfetti} onCheckedChange={handleConfettiChange} />
                  <span className="text-sm text-muted-foreground">an</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
           <Card>
            <CardHeader>
              <CardTitle>Vokabelabfrage</CardTitle>
              <CardDescription>Verwalte deine Lern- und Abfrageeinstellungen für Vokabeln und Verben.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="query-direction-overview">
                  Anzeige in der Übersicht
                </Label>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Deutsches Wort</span>
                    <Switch 
                      id="query-direction-overview" 
                      className="data-[state=checked]:bg-input data-[state=unchecked]:bg-input [&>span]:bg-background"
                      checked={queryDirectionOverview}
                      onCheckedChange={handleQueryDirectionOverviewChange}
                    />
                    <span className="text-sm text-muted-foreground">Fremdwort</span>
                </div>
              </div>
               <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="query-direction-flashcards">
                  Abfragerichtung der Karteikarten
                </Label>
                 <div className="flex items-center gap-4">
                    <span className={cn("text-sm transition-colors", !queryDirectionFlashcards ? "text-foreground font-medium" : "text-muted-foreground")}>Deutsches Wort</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleQueryDirectionFlashcardsChange(!queryDirectionFlashcards)}>
                        {queryDirectionFlashcards ? <ArrowRight className="h-5 w-5"/> : <ArrowLeft className="h-5 w-5"/>}
                    </Button>
                    <span className={cn("text-sm transition-colors", queryDirectionFlashcards ? "text-foreground font-medium" : "text-muted-foreground")}>Fremdwort</span>
                </div>
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="show-hints">
                  <span>Hinweise auf der Rückseite</span>
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">ausblenden</span>
                  <Switch 
                    id="show-hints"
                    checked={showHints}
                    onCheckedChange={handleShowHintsChange}
                  />
                  <span className="text-sm text-muted-foreground">einblenden</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
