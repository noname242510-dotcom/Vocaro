'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SectionShell } from './section-shell';

export function LanguageSettings() {
  return (
    <SectionShell title="Sprache & System" description="Passe die Spracheinstellungen der App an.">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="language-selection" className="flex flex-col space-y-1">
              <span>App-Sprache</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Ändert die Sprache der Benutzeroberfläche.
              </span>
            </Label>
            <Select defaultValue="de">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sprache auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </SectionShell>
  );
}