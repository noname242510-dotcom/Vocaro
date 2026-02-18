'use client';

import { useState, useCallback, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SpeakerButtonProps {
  text: string;
  languageHint?: string;
  className?: string;
}

export const SpeakerButton = forwardRef<{ play: () => void }, SpeakerButtonProps>(
  ({ text, languageHint, className }, ref) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Hilfsfunktion: Mapping der Sprache
    const getLanguageCode = (hint?: string): string => {
      if (!hint) return 'en-US';
      const lowerHint = hint.toLowerCase();
      const map: Record<string, string> = {
        'französisch': 'fr-FR', 'french': 'fr-FR',
        'spanisch': 'es-ES', 'spanish': 'es-ES',
        'italienisch': 'it-IT', 'italian': 'it-IT',
        'portugiesisch': 'pt-BR', 'portuguese': 'pt-BR',
        'russisch': 'ru-RU', 'russian': 'ru-RU',
        'englisch': 'en-US', 'english': 'en-US',
        'deutsch': 'de-DE', 'german': 'de-DE',
      };

      for (const key in map) {
        if (lowerHint.includes(key)) return map[key];
      }
      return 'en-US';
    };

    // Die "Geheimzutat": Suche nach der besten Stimme im Browser
    const getBestVoice = (lang: string): SpeechSynthesisVoice | null => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return null;

      // Filter nach Sprache (z.B. 'de')
      const targetLang = lang.split('-')[0];
      const langVoices = voices.filter(v => v.lang.startsWith(targetLang));

      // Priorisierung von Premium-Stimmen für natürlichen Klang
      return (
        langVoices.find(v => v.name.includes('Google') || v.name.includes('Natural')) ||
        langVoices.find(v => v.name.includes('Microsoft') || v.name.includes('Apple')) ||
        langVoices[0] || 
        null
      );
    };

    // Stimmen-Cache im Browser aktivieren
    useEffect(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.getVoices();
      }
    }, []);

    const play = useCallback(() => {
      if (typeof window === 'undefined' || !window.speechSynthesis || !text) {
        return;
      }

      // Laufende Sprachausgabe abbrechen
      window.speechSynthesis.cancel();

      const langCode = getLanguageCode(languageHint);
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Stimme zuweisen
      const bestVoice = getBestVoice(langCode);
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
      
      utterance.lang = langCode;
      utterance.rate = 0.9; // Leicht langsamer wirkt oft natürlicher
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => {
        setIsPlaying(false);
        utteranceRef.current = null;
      };
      utterance.onerror = (event) => {
        if (event.error !== 'canceled') {
          console.error('TTS Error:', event);
        }
        setIsPlaying(false);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }, [text, languageHint]);

    useImperativeHandle(ref, () => ({ play }));

    return (
      <div className={cn("relative h-10 w-10", className)}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "w-full h-full transition-colors",
            isPlaying ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={(e) => {
            e.stopPropagation();
            play();
          }}
          aria-label="Play audio"
        >
          <Volume2 className={cn("h-5 w-5", isPlaying && "animate-pulse")} />
        </Button>
      </div>
    );
  }
);

SpeakerButton.displayName = 'SpeakerButton';