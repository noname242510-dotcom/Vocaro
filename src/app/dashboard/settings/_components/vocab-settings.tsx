'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionShell } from './section-shell';
import { cn } from '@/lib/utils';

export function VocabSettings() {
  const [queryDirectionOverview, setQueryDirectionOverview] = useState(false);
  const [queryDirectionFlashcards, setQueryDirectionFlashcards] = useState(false);
  const [showVocabHints, setShowVocabHints] = useState(true);

  useEffect(() => {
    const persistedQueryDirectionOverview = localStorage.getItem('query-direction-overview');
    setQueryDirectionOverview(persistedQueryDirectionOverview === 'true');
    
    const persistedQueryDirectionFlashcards = localStorage.getItem('query-direction-flashcards');
    setQueryDirectionFlashcards(persistedQueryDirectionFlashcards === 'true');

    const persistedShowVocabHints = localStorage.getItem('show-vocab-hints');
    setShowVocabHints(persistedShowVocabHints === null ? true : persistedShowVocabHints === 'true');
  }, []);

  const handleQueryDirectionOverviewChange = (checked: boolean) => {
    setQueryDirectionOverview(checked);
    localStorage.setItem('query-direction-overview', String(checked));
  };
  
  const handleQueryDirectionFlashcardsChange = (checked: boolean) => {
    setQueryDirectionFlashcards(checked);
    localStorage.setItem('query-direction-flashcards', String(checked));
  };
  
  const handleShowVocabHintsChange = (checked: boolean) => {
    setShowVocabHints(checked);
    localStorage.setItem('show-vocab-hints', String(checked));
  };

  return (
    <SectionShell title="Vokabelabfrage" description="Verwalte deine Lern- und Abfrageeinstellungen für Vokabeln.">
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="query-direction-overview" className="flex flex-col space-y-1">
              <span>Anzeige in der Übersicht</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Welches Wort in der Vokabelliste vorne steht.
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <span className={cn("text-sm text-center transition-colors w-20", !queryDirectionOverview ? "text-foreground font-medium" : "text-muted-foreground")}>Deutsch</span>
              <Switch 
                id="query-direction-overview"
                checked={queryDirectionOverview}
                onCheckedChange={handleQueryDirectionOverviewChange}
              />
              <span className={cn("text-sm text-center transition-colors w-20", queryDirectionOverview ? "text-foreground font-medium" : "text-muted-foreground")}>Fremdwort</span>
            </div>
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="query-direction-flashcards" className="flex flex-col space-y-1">
              <span>Abfragerichtung der Karteikarten</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Legt fest, welche Sprache zuerst gezeigt wird.
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <span className={cn("text-sm text-center transition-colors w-20", !queryDirectionFlashcards ? "text-foreground font-medium" : "text-muted-foreground")}>Deutsch → Fremdwort</span>
              <Switch 
                id="query-direction-flashcards"
                checked={queryDirectionFlashcards}
                onCheckedChange={handleQueryDirectionFlashcardsChange}
              />
              <span className={cn("text-sm text-center transition-colors w-20", queryDirectionFlashcards ? "text-foreground font-medium" : "text-muted-foreground")}>Fremdwort → Deutsch</span>
            </div>
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="show-hints" className="flex flex-col space-y-1">
              <span>Hinweise auf der Rückseite</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Zeigt optionale Notizen und Beispiele an.
              </span>
            </Label>
            <Switch 
              id="show-hints"
              checked={showVocabHints}
              onCheckedChange={handleShowVocabHintsChange}
            />
          </div>
        </CardContent>
      </Card>
    </SectionShell>
  );
}