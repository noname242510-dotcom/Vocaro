'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SectionShell } from './section-shell';

export function AppearanceSettings() {
  const [font, setFont] = useState('font-body');
  const [enableConfetti, setEnableConfetti] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  useEffect(() => {
    const persistedFont = localStorage.getItem('app-font') || 'font-body';
    handleFontChange(persistedFont);

    const persistedConfetti = localStorage.getItem('enable-confetti');
    setEnableConfetti(persistedConfetti === null ? true : persistedConfetti === 'true');
    
    const persistedHaptics = localStorage.getItem('haptic-feedback-enabled');
    setHapticFeedback(persistedHaptics === null ? true : persistedHaptics === 'true');
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
  
  const handleHapticFeedbackChange = (checked: boolean) => {
    setHapticFeedback(checked);
    localStorage.setItem('haptic-feedback-enabled', String(checked));
  }
  
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

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="haptic-feedback" className="flex flex-col space-y-1">
              <span>Haptisches Feedback</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Gibt bei Aktionen Vibrationsfeedback (auf unterstützten Geräten).
              </span>
            </Label>
            <Switch id="haptic-feedback" checked={hapticFeedback} onCheckedChange={handleHapticFeedbackChange} />
          </div>

        </CardContent>
      </Card>
    </SectionShell>
  );
}
