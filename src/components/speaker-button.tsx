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
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // 1. Stimmen laden und auf Browser-Event warten
    useEffect(() => {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);
        }
      };

      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices(); // Erster Versuch beim Mounten

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }, []);

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

    const getBestVoice = (lang: string): SpeechSynthesisVoice | null => {
      if (voices.length === 0) return null;
      
      const targetLang = lang.split('-')[0].toLowerCase();
      const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(targetLang));

      if (langVoices.length === 0) return null;

      // Priorität: Google/Microsoft/Apple (Natural) > Erste verfügbare Sprache
      return (
        langVoices.find(v => v.name.includes('Google') || v.name.includes('Natural')) ||
        langVoices.find(v => v.name.includes('Microsoft') || v.name.includes('Apple')) ||
        langVoices[0]
      );
    };

    const play = useCallback(() => {
      if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;

      window.speechSynthesis.cancel();

      const langCode = getLanguageCode(languageHint);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;

      const selectedVoice = getBestVoice(langCode);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else {
        // Wenn wirklich gar nichts gefunden wurde, erzwingen wir zumindest den Lang-Code
        console.warn("Fallback: Nutze nur Lang-Code für", langCode);
      }

      utterance.rate = 0.85; 
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }, [text, languageHint, voices]); // "voices" muss hier als Dependency rein!

    useImperativeHandle(ref, () => ({ play }));

    return (
      <div className={cn("relative h-10 w-10", className)}>
        <Button
          variant="ghost"
          size="icon"
          className={cn("w-full h-full", isPlaying && "text-blue-500")}
          onClick={(e) => {
            e.stopPropagation();
            play();
          }}
        >
          <Volume2 className={cn("h-5 w-5", isPlaying && "animate-pulse")} />
        </Button>
      </div>
    );
  }
);

SpeakerButton.displayName = 'SpeakerButton';