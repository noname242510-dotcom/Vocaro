'use client';

import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
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

    const getLanguageCode = (hint?: string): string => {
        if (!hint) return 'en';
        const lowerHint = hint.toLowerCase();
        if (lowerHint.includes('französisch') || lowerHint.includes('french')) return 'fr-FR';
        if (lowerHint.includes('spanisch') || lowerHint.includes('spanish')) return 'es-ES';
        if (lowerHint.includes('italienisch') || lowerHint.includes('italian')) return 'it-IT';
        if (lowerHint.includes('portugiesisch') || lowerHint.includes('portuguese')) return 'pt-BR';
        if (lowerHint.includes('russisch') || lowerHint.includes('russian')) return 'ru-RU';
        if (lowerHint.includes('englisch') || lowerHint.includes('english')) return 'en-US';
        if (lowerHint.includes('deutsch') || lowerHint.includes('german')) return 'de-DE';
        return 'en';
    };

    const play = useCallback(() => {
      if (typeof window === 'undefined' || !window.speechSynthesis || !text) {
        return;
      }
      
      // Stop any currently playing utterance
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getLanguageCode(languageHint);
      
      // No voice selection, let the browser choose. This is the most robust way.

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = (event) => {
        if (event.error !== 'canceled') {
            console.error('SpeechSynthesis Error:', event.error);
        }
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
    }, [text, languageHint]);

    useImperativeHandle(ref, () => ({ play }));

    return (
      <div className={cn("relative h-10 w-10", className)}>
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-full text-muted-foreground hover:text-foreground"
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
