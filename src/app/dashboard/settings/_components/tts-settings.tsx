'use client';


import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionShell } from './section-shell';

export function TtsSettings() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isAutoPlaybackEnabled, setIsAutoPlaybackEnabled] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const enabledSetting = localStorage.getItem('tts-enabled');
    if (enabledSetting === null) {
      // If the setting is not in localStorage, default it to 'true'.
      setIsEnabled(true);
      localStorage.setItem('tts-enabled', 'true');
    } else {
      setIsEnabled(enabledSetting === 'true');
    }

    const autoPlaybackSetting = localStorage.getItem('tts-auto-playback');
    if (autoPlaybackSetting === null) {
      // Default auto-playback to 'true' as well.
      setIsAutoPlaybackEnabled(true);
      localStorage.setItem('tts-auto-playback', 'true');
    } else {
      setIsAutoPlaybackEnabled(autoPlaybackSetting === 'true');
    }
  }, []);

  const handleEnabledChange = (checked: boolean) => {
    setIsEnabled(checked);
    localStorage.setItem('tts-enabled', String(checked));
  };

  const handleAutoPlaybackChange = (checked: boolean) => {
    setIsAutoPlaybackEnabled(checked);
    localStorage.setItem('tts-auto-playback', String(checked));
  };

  if (!isMounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <SectionShell title="Sprachausgabe" description="Passe die Text-zu-Sprache-Funktion an.">
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="tts-enabled" className="flex flex-col space-y-1">
              <span>Sprachausgabe aktivieren</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Spielt Vokabeln und Verben laut ab.
              </span>
            </Label>
            <Switch
              id="tts-enabled"
              checked={isEnabled}
              onCheckedChange={handleEnabledChange}
            />
          </div>

          {isEnabled && (
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="auto-playback-enabled" className="flex flex-col space-y-1">
                <span>Automatische Wiedergabe</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Spielt die Aussprache automatisch ab, wenn eine neue Karte angezeigt wird.
                </span>
              </Label>
              <Switch
                id="auto-playback-enabled"
                checked={isAutoPlaybackEnabled}
                onCheckedChange={handleAutoPlaybackChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </SectionShell>
  );
}