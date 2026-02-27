'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionShell } from './section-shell';
import { useSettings } from '@/contexts/settings-context';
import { Skeleton } from '@/components/ui/skeleton';

export function TtsSettings() {
  const { settings, updateSettings, isLoading } = useSettings();

  if (isLoading) {
    return (
        <SectionShell title="Sprachausgabe" description="Passe die Text-zu-Sprache-Funktion an.">
            <Card>
                <CardContent className="pt-6 space-y-6">
                    <div className="flex items-center justify-between space-x-2">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-6 w-11" />
                    </div>
                </CardContent>
            </Card>
        </SectionShell>
    )
  }

  const handleEnabledChange = (checked: boolean) => {
    updateSettings({ ttsEnabled: checked });
    // If TTS is disabled, also disable autoplay
    if (!checked) {
      updateSettings({ ttsAutoplay: false });
    }
  };

  const handleAutoplayChange = (checked: boolean) => {
    updateSettings({ ttsAutoplay: checked });
  };

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
              checked={settings?.ttsEnabled}
              onCheckedChange={handleEnabledChange} 
            />
          </div>

          {settings?.ttsEnabled && (
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="autoplay-enabled" className="flex flex-col space-y-1">
                <span>Automatische Sprachausgabe</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Spielt Vokabeln automatisch beim Anzeigen ab.
                </span>
              </Label>
              <Switch 
                id="autoplay-enabled"
                checked={settings?.ttsAutoplay}
                onCheckedChange={handleAutoplayChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </SectionShell>
  );
}

    