'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SectionShell } from './section-shell';
import { useSettings } from '@/contexts/settings-context';
import type { UserSettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ModeToggle } from '@/components/mode-toggle';

export function AppearanceSettings() {
  const { settings, updateSettings, isLoading } = useSettings();

  if (isLoading) {
    return (
      <SectionShell title="Darstellung" description="Passe an, wie Vocaro aussieht und sich anfühlt.">
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-44" />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-6 w-11" />
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

  const handleFontChange = (newFont: string) => {
    updateSettings({ font: newFont as UserSettings['font'] });
  };

  const handleConfettiChange = (checked: boolean) => {
    updateSettings({ enableConfetti: checked });
  };

  const handleHapticFeedbackChange = (checked: boolean) => {
    updateSettings({ hapticFeedback: checked });
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
            <Select value={settings?.font} onValueChange={handleFontChange}>
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
            <Label htmlFor="dark-mode" className="flex flex-col space-y-1">
              <span>Dunkelmodus</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Wechsle zwischen hellem und dunklem Erscheinungsbild.
              </span>
            </Label>
            <ModeToggle />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="confetti-mode" className="flex flex-col space-y-1">
              <span>Konfetti bei Erfolg</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Zeigt eine Animation bei ≥90% richtigen Antworten.
              </span>
            </Label>
            <Switch id="confetti-mode" checked={settings?.enableConfetti} onCheckedChange={handleConfettiChange} />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="haptic-feedback" className="flex flex-col space-y-1">
              <span>Haptisches Feedback</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Gibt bei Aktionen Vibrationsfeedback (auf unterstützten Geräten).
              </span>
            </Label>
            <Switch id="haptic-feedback" checked={settings?.hapticFeedback} onCheckedChange={handleHapticFeedbackChange} />
          </div>

        </CardContent>
      </Card>
    </SectionShell >
  );
}
