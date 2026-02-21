'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionShell } from './section-shell';

export function TtsSettings() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const persistedEnabled = localStorage.getItem('tts-enabled') === 'true';
    setIsEnabled(persistedEnabled);

    const persistedAutoplay = localStorage.getItem('tts-autoplay-enabled');
    setIsAutoplayEnabled(persistedAutoplay === null ? true : persistedAutoplay === 'true');
  }, []);

  const handleEnabledChange = (checked: boolean) => {
    setIsEnabled(checked);
    localStorage.setItem('tts-enabled', String(checked));
  };

  const handleAutoplayChange = (checked: boolean) => {
    setIsAutoplayEnabled(checked);
    localStorage.setItem('tts-autoplay-enabled', String(checked));
  };
  
  if (!isMounted) {
    return null; // Don't render on server
  }

  return (
    <SectionShell title="Sprachausgabe" description="Passe die Text-zu-Sprache-Funktion an.">
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="tts-enabled" className="flex flex-col space-y-1">
              <span>Sprachausgabe aktivieren</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Zeigt einen Button zum Abspielen von Vokabeln an.
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
              <Label htmlFor="autoplay-enabled" className="flex flex-col space-y-1">
                <span>Automatische Sprachausgabe</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Spielt Vokabeln automatisch beim Anzeigen ab.
                </span>
              </Label>
              <Switch 
                id="autoplay-enabled"
                checked={isAutoplayEnabled}
                onCheckedChange={handleAutoplayChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </SectionShell>
  );
}
