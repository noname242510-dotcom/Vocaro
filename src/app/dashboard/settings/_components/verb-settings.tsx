'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionShell } from './section-shell';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function VerbSettings() {
  const [queryDirectionVerbs, setQueryDirectionVerbs] = useState(false);
  const [showVerbHints, setShowVerbHints] = useState(true);

  useEffect(() => {
    // false: term -> definition (Fremdwort -> Deutsch)
    // true: definition -> term (Deutsch -> Fremdwort)
    const persistedQueryDirectionVerbs = localStorage.getItem('query-direction-verbs') === 'true';
    setQueryDirectionVerbs(persistedQueryDirectionVerbs);
    
    const persistedShowVerbHints = localStorage.getItem('show-verb-hints');
    setShowVerbHints(persistedShowVerbHints === null ? true : persistedShowVerbHints === 'true');
  }, []);

  const handleQueryDirectionVerbsChange = (checked: boolean) => {
    setQueryDirectionVerbs(checked);
    localStorage.setItem('query-direction-verbs', String(checked));
  };

  const handleShowVerbHintsChange = (checked: boolean) => {
    setShowVerbHints(checked);
    localStorage.setItem('show-verb-hints', String(checked));
  };

  return (
    <SectionShell title="Verbabfrage" description="Verwalte deine Lern- und Abfrageeinstellungen für Verben.">
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="query-direction-verbs" className="flex flex-col space-y-1">
              <span>Abfragerichtung der Karteikarten</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Legt fest, welche Sprache zuerst gezeigt wird.
              </span>
            </Label>
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Fremdwort</span>
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={() => handleQueryDirectionVerbsChange(!queryDirectionVerbs)}>
                  <ArrowRight className={cn("h-4 w-4 transition-transform duration-300", queryDirectionVerbs && "rotate-180")} />
                </Button>
                <span className="text-sm font-medium text-muted-foreground">Deutsch</span>
            </div>
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="show-verb-hints" className="flex flex-col space-y-1">
              <span>Infinitiv als Hinweis</span>
               <span className="font-normal leading-snug text-muted-foreground">
                Zeigt das Infinitiv des Verbs als Hilfe an.
              </span>
            </Label>
            <Switch 
              id="show-verb-hints"
              checked={showVerbHints}
              onCheckedChange={handleShowVerbHintsChange}
            />
          </div>
        </CardContent>
      </Card>
    </SectionShell>
  );
}
