'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SectionShell } from './section-shell';

export function TtsSettings() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(undefined);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Load voices and settings from localStorage
    const handleVoicesChanged = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        const persistedVoiceURI = localStorage.getItem('tts-voice-uri');
        if (persistedVoiceURI && availableVoices.some(v => v.voiceURI === persistedVoiceURI)) {
            setSelectedVoice(persistedVoiceURI);
        } else if (availableVoices.length > 0) {
            // Fallback to the first available voice if saved one is not found
            setSelectedVoice(availableVoices[0].voiceURI);
        }
    };
    
    // Initial load and event listener
    handleVoicesChanged();
    window.speechSynthesis.onvoiceschanged = handleVoicesChanged;

    const persistedEnabled = localStorage.getItem('tts-enabled') === 'true';
    setIsEnabled(persistedEnabled);

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const handleEnabledChange = (checked: boolean) => {
    setIsEnabled(checked);
    localStorage.setItem('tts-enabled', String(checked));
  };

  const handleVoiceChange = (voiceURI: string) => {
    setSelectedVoice(voiceURI);
    localStorage.setItem('tts-voice-uri', voiceURI);
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
              <Label htmlFor="voice-selection" className="flex flex-col space-y-1">
                <span>Stimme auswählen</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Wähle die Stimme für die Sprachausgabe.
                </span>
              </Label>
              <Select value={selectedVoice} onValueChange={handleVoiceChange} disabled={voices.length === 0}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Stimme auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {voices.length > 0 ? voices.map((voice) => (
                    <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                      {`${voice.name} (${voice.lang})`}
                    </SelectItem>
                  )) : (
                    <SelectItem value="no-voice" disabled>Keine Stimmen verfügbar</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
    </SectionShell>
  );
}
