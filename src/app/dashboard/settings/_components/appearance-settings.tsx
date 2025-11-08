'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SectionShell } from './section-shell';

export function AppearanceSettings() {
  const [font, setFont] = useState('font-body');
  const [enableConfetti, setEnableConfetti] = useState(true);
  const [cardLayout, setCardLayout] = useState('standard');

  useEffect(() => {
    const persistedFont = localStorage.getItem('app-font') || 'font-body';
    handleFontChange(persistedFont);

    const persistedConfetti = localStorage.getItem('enable-confetti');
    setEnableConfetti(persistedConfetti === null ? true : persistedConfetti === 'true');
    
    const persistedLayout = localStorage.getItem('card-layout') || 'standard';
    setCardLayout(persistedLayout);
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
  
  const handleCardLayoutChange = (value: string) => {
    setCardLayout(value);
    localStorage.setItem('card-layout', value);
  };

  return (
    <SectionShell title="Darstellung" description="Passe an, wie Vocaro aussieht und sich anfühlt.">
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="font-selection" className="flex flex-col space-y-1">
              <span>Schriftart</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Wähle die primäre Schriftart für die Anwendung.
              </span>
            </Label>
            <Select value={font} onValueChange={handleFontChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Schriftart auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="font-body" className="font-body">PT Sans (Standard)</SelectItem>
                <SelectItem value="font-creative" className="font-creative">Merriweather (Kreativ)</SelectItem>
                <SelectItem value="font-code" className="font-code">Inconsolata (Code)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="confetti-mode" className="flex flex-col space-y-1">
              <span>Konfetti bei Erfolg</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Zeigt eine Animation bei ≥90% richtigen Antworten.
              </span>
            </Label>
            <Switch id="confetti-mode" checked={enableConfetti} onCheckedChange={handleConfettiChange} />
          </div>

          <div className="flex flex-col space-y-3">
            <Label>Kartenlayout</Label>
            <RadioGroup defaultValue={cardLayout} onValueChange={handleCardLayoutChange} className="grid grid-cols-3 gap-4">
              <div>
                <RadioGroupItem value="compact" id="layout-compact" className="peer sr-only" />
                <Label htmlFor="layout-compact" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                  Kompakt
                </Label>
              </div>
              <div>
                <RadioGroupItem value="standard" id="layout-standard" className="peer sr-only" />
                <Label htmlFor="layout-standard" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                  Standard
                </Label>
              </div>
              <div>
                <RadioGroupItem value="large" id="layout-large" className="peer sr-only" />
                <Label htmlFor="layout-large" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                  Groß
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </SectionShell>
  );
}