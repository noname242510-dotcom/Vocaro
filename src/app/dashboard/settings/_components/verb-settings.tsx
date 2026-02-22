'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionShell } from './section-shell';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/settings-context';
import { Skeleton } from '@/components/ui/skeleton';

export function VerbSettings() {
  const { settings, updateSettings, isLoading } = useSettings();

  if (isLoading) {
     return (
        <SectionShell title="Verbabfrage" description="Verwalte deine Lern- und Abfrageeinstellungen für Verben.">
            <Card>
                <CardContent className="pt-6 space-y-6">
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

  const handleQueryDirectionVerbsChange = (checked: boolean) => {
    updateSettings({ verbQueryDirection: checked });
  };

  const handleShowVerbHintsChange = (checked: boolean) => {
    updateSettings({ verbShowHints: checked });
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
                 <div 
                    className="p-2 cursor-pointer rounded-full hover:bg-accent"
                    onClick={() => handleQueryDirectionVerbsChange(!settings?.verbQueryDirection)}
                >
                    <ArrowRight className={cn("h-5 w-5 text-muted-foreground transition-transform duration-300", settings?.verbQueryDirection && "rotate-180")} />
                </div>
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
              checked={settings?.verbShowHints}
              onCheckedChange={handleShowVerbHintsChange}
            />
          </div>
        </CardContent>
      </Card>
    </SectionShell>
  );
}
