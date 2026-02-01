
'use client';

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
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
    const [animationDuration, setAnimationDuration] = useState(2000); // Default/fallback duration

    const getLanguageCode = (hint?: string): string => {
        if (!hint) return 'en-US';
        const lowerHint = hint.toLowerCase();
        if (lowerHint.includes('französisch') || lowerHint.includes('french')) return 'fr-FR';
        if (lowerHint.includes('spanisch') || lowerHint.includes('spanish')) return 'es-ES';
        if (lowerHint.includes('italienisch') || lowerHint.includes('italian')) return 'it-IT';
        if (lowerHint.includes('portugiesisch') || lowerHint.includes('portuguese')) return 'pt-BR';
        if (lowerHint.includes('russisch') || lowerHint.includes('russian')) return 'ru-RU';
        if (lowerHint.includes('englisch') || lowerHint.includes('english')) return 'en-US';
        return 'en-US'; // Default
    };

    const handlePlay = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();

      if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
        return;
      }
      
      // Cancel any ongoing speech before starting a new one
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      // Estimate duration for the animation. This is a fallback as SpeechSynthesis doesn't provide a reliable duration property upfront.
      // The onend event will ensure the animation stops accurately.
      const estimatedDuration = Math.max(1000, text.length * 75);
      setAnimationDuration(estimatedDuration);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getLanguageCode(languageHint);
      utterance.rate = 0.85;
      utterance.pitch = 1;

      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang === utterance.lang);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        setIsPlaying(true);
      };
      utterance.onend = () => {
        setIsPlaying(false);
      };
      utterance.onerror = (event) => {
        if (event.error !== 'canceled') {
            console.error("SpeechSynthesis Error:", event.error);
        }
        setIsPlaying(false);
      };
      
      // A small delay can help prevent issues on some browsers where the first speak call is missed.
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 50);

    }, [text, languageHint]);

    useImperativeHandle(ref, () => ({
      play: () => handlePlay(),
    }));
    
    // Ensure voices are loaded
    useEffect(() => {
        const synth = window.speechSynthesis;
        const loadVoices = () => {
          // This just triggers the browser to load the voices.
          synth.getVoices();
        };
        loadVoices();
        if (synth.onvoiceschanged !== undefined) {
          synth.onvoiceschanged = loadVoices;
        }
        
        // Cleanup function to cancel speech if the component unmounts while speaking
        return () => {
            if (synth.speaking) {
                synth.cancel();
            }
        };
    }, []);

    return (
      <div className={cn("relative h-10 w-10", className)}>
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-full text-muted-foreground hover:text-foreground"
          onClick={handlePlay}
        >
            <Volume2 className="h-5 w-5" />
        </Button>
        <svg
          className="absolute top-0 left-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox="0 0 36 36"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            className={cn("stroke-primary transition-all", isPlaying ? 'opacity-100' : 'opacity-0')}
            strokeWidth="2"
            strokeDasharray="100"
            strokeDashoffset={isPlaying ? 0 : 100}
            style={{
              transition: isPlaying ? `stroke-dashoffset ${animationDuration}ms linear` : 'none',
            }}
          />
        </svg>
      </div>
    );
  }
);

SpeakerButton.displayName = 'SpeakerButton';
