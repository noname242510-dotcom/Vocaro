
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionShell } from './_components/section-shell';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function VocabSettings() {
  const [queryDirectionOverview, setQueryDirectionOverview] = useState('term'); // 'term' or 'definition'
  const [queryDirectionFlashcards, setQueryDirectionFlashcards] = useState(true);
  const [showVocabHints, setShowVocabHints] = useState(true);

  useEffect(() => {
    // 'term' (Fremdwort) or 'definition' (Deutsch)
    const persistedQueryDirectionOverview = localStorage.getItem('query-direction-overview');
    if (persistedQueryDirectionOverview) {
        setQueryDirectionOverview(persistedQueryDirectionOverview);
    }
    
    // true: definition -> term (Deutsch -> Fremdwort)
    const persistedQueryDirectionFlashcards = localStorage.getItem('query-direction-flashcards');
    if (persistedQueryDirectionFlashcards !== null) {
      setQueryDirectionFlashcards(persistedQueryDirectionFlashcards === 'true');
    } else {
      setQueryDirectionFlashcards(true); // Default to German first
    }

    const persistedShowVocabHints = localStorage.getItem('show-vocab-hints');
    setShowVocabHints(persistedShowVocabHints === null ? true : persistedShowVocabHints === 'true');
  }, []);

  const handleQueryDirectionOverviewChange = (value: string) => {
    setQueryDirectionOverview(value);
    localStorage.setItem('query-direction-overview', value);
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
            <RadioGroup 
              value={queryDirectionOverview} 
              onValueChange={handleQueryDirectionOverviewChange}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="term" id="r-term" />
                <Label htmlFor="r-term" className="font-normal">Fremdwort</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="definition" id="r-definition" />
                <Label htmlFor="r-definition" className="font-normal">Deutsch</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="query-direction-flashcards" className="flex flex-col space-y-1">
              <span>Abfragerichtung der Karteikarten</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Legt fest, welche Sprache zuerst gezeigt wird.
              </span>
            </Label>
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Fremdwort</span>
                <div 
                    className="p-2 cursor-pointer rounded-full hover:bg-accent"
                    onClick={() => handleQueryDirectionFlashcardsChange(!queryDirectionFlashcards)}
                >
                    <ArrowRight className={cn("h-5 w-5 text-muted-foreground transition-transform duration-300", queryDirectionFlashcards && "rotate-180")} />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Deutsch</span>
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
