'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
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
    const [animationDuration, setAnimationDuration] = useState(2000);
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        const loadAndStoreVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            if (availableVoices.length > 0) {
                voicesRef.current = availableVoices;
                // Once voices are loaded, we don't need the listener anymore for this instance.
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
        
        // Set up the event listener in case voices are not immediately available.
        window.speechSynthesis.onvoiceschanged = loadAndStoreVoices;
        
        // Attempt to load voices immediately.
        loadAndStoreVoices();

        return () => {
            // Cleanup: remove listener and cancel any speech on unmount.
            window.speechSynthesis.onvoiceschanged = null;
            if (window.speechSynthesis?.speaking) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const getLanguageCode = (hint?: string): string => {
        if (!hint) return 'en-US';
        const lowerHint = hint.toLowerCase();
        if (lowerHint.includes('französisch') || lowerHint.includes('french')) return 'fr-FR';
        if (lowerHint.includes('spanisch') || lowerHint.includes('spanish')) return 'es-ES';
        if (lowerHint.includes('italienisch') || lowerHint.includes('italian')) return 'it-IT';
        if (lowerHint.includes('portugiesisch') || lowerHint.includes('portuguese')) return 'pt-BR';
        if (lowerHint.includes('russisch') || lowerHint.includes('russian')) return 'ru-RU';
        if (lowerHint.includes('englisch') || lowerHint.includes('english')) return 'en-US';
        if (lowerHint.includes('deutsch') || lowerHint.includes('german')) return 'de-DE';
        return 'en-US'; // Default
    };

    const handlePlay = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();

      if (typeof window === 'undefined' || !('speechSynthesis'in window) || !text) {
        return;
      }
      
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      const targetLang = getLanguageCode(languageHint);
      utterance.lang = targetLang;
      utterance.rate = 0.85;
      utterance.pitch = 1;

      // Use the stored voices from the ref. Fallback to getting them directly as a safeguard.
      const allVoices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
      
      if (allVoices.length > 0) {
        const preferredVoiceURI = localStorage.getItem('tts-voice-uri');
        let selectedVoice: SpeechSynthesisVoice | undefined;

        if (preferredVoiceURI) {
          selectedVoice = allVoices.find(v => v.voiceURI === preferredVoiceURI);
        }

        if (!selectedVoice) {
            const targetLangBase = targetLang.split('-')[0];
            const potentialVoices = allVoices.filter(
                v => v.lang === targetLang && !v.name.includes('Google') && v.localService
            );
            
            if (potentialVoices.length > 0) {
                selectedVoice = potentialVoices[0];
            } else {
                selectedVoice = allVoices.find(v => v.lang.startsWith(targetLangBase));
            }
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }
      
      const estimatedDuration = Math.max(1000, text.length * 75);
      setAnimationDuration(estimatedDuration);

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

      window.speechSynthesis.speak(utterance);

    }, [text, languageHint]);

    useImperativeHandle(ref, () => ({
      play: handlePlay,
    }));

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