
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionShell } from './_components/section-shell';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useSettings } from '@/contexts/settings-context';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserSettings } from '@/lib/types';

export function VocabSettings() {
  const { settings, updateSettings, isLoading } = useSettings();

  if (isLoading) {
    return (
       <SectionShell title="Vokabelabfrage" description="Verwalte deine Lern- und Abfrageeinstellungen für Vokabeln.">
           <Card>
               <CardContent className="pt-6 space-y-6">
                   <div className="flex items-center justify-between space-x-2">
                       <Skeleton className="h-10 w-48" />
                       <Skeleton className="h-8 w-40" />
                   </div>
                    <div className="flex items-center justify-between space-x-2">
                       <Skeleton className="h-10 w-48" />
                       <Skeleton className="h-8 w-40" />
                   </div>
                    <div className="flex items-center justify-between space-x-2">
                       <Skeleton className="h-10 w-48" />
                       <Skeleton className="h-6 w-11" />
                   </div>
               </CardContent>
           </Card>
       </SectionShell>
   )
 }

  const handleQueryDirectionOverviewChange = (value: string) => {
    updateSettings({ vocabOverviewDirection: value as UserSettings['vocabOverviewDirection'] });
  };
  
  const handleQueryDirectionFlashcardsChange = (checked: boolean) => {
    updateSettings({ vocabQueryDirection: checked });
  };
  
  const handleShowVocabHintsChange = (checked: boolean) => {
    updateSettings({ vocabShowHints: checked });
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
              value={settings?.vocabOverviewDirection} 
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
                    onClick={() => handleQueryDirectionFlashcardsChange(!settings?.vocabQueryDirection)}
                >
                    <ArrowRight className={cn("h-5 w-5 text-muted-foreground transition-transform duration-300", settings?.vocabQueryDirection && "rotate-180")} />
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
              checked={settings?.vocabShowHints}
              onCheckedChange={handleShowVocabHintsChange}
            />
          </div>
        </CardContent>
      </Card>
    </SectionShell>
  );
}
