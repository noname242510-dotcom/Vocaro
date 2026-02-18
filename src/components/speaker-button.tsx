'use client';

import { useState, useCallback, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SpeakerButtonProps {
  text: string;
  languageHint?: string;
  className?: string;
  autoplay?: boolean;
}

export const SpeakerButton = forwardRef<{ play: () => void }, SpeakerButtonProps>(
  ({ text, languageHint, className, autoplay }, ref) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
    const hasAutoplayedRef = useRef(false);

    useEffect(() => {
      const loadVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      };
    }, []);
    
    useEffect(() => {
        hasAutoplayedRef.current = false;
    }, [text]);

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
      return 'en-US'; // Fallback
    };
    
    const play = useCallback(() => {
      if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
      
      if (voicesRef.current.length === 0) {
        setTimeout(play, 100);
        return;
      }

      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getLanguageCode(languageHint);

      const voices = voicesRef.current;
      const persistedVoiceURI = localStorage.getItem('tts-voice-uri');
      
      let selectedVoice: SpeechSynthesisVoice | null = null;
      if (persistedVoiceURI) {
        selectedVoice = voices.find(v => v.voiceURI === persistedVoiceURI) || null;
      }
      
      if (!selectedVoice && voices.length > 0) {
        const langCode = getLanguageCode(languageHint);
        const targetLang = langCode.split('-')[0].toLowerCase();
        const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(targetLang));
        
        selectedVoice = 
            langVoices.find(v => v.name.includes('Google')) ||
            langVoices.find(v => v.name.includes('Natural')) ||
            langVoices.find(v => v.name.includes('Microsoft')) ||
            langVoices.find(v => v.name.includes('Apple')) ||
            langVoices[0] ||
            null;
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.rate = 0.85; 
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = (event) => {
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          console.error("SpeechSynthesis Error:", event.error);
        }
        setIsPlaying(false);
      };
      
      window.speechSynthesis.speak(utterance);
    }, [text, languageHint]);

    useImperativeHandle(ref, () => ({
      play,
    }));

    useEffect(() => {
        if (autoplay && text && !hasAutoplayedRef.current) {
            play();
            hasAutoplayedRef.current = true;
        }
    }, [autoplay, text, play]);

    return (
      <div className={cn("relative h-10 w-10", className)}>
         <Button
          variant="ghost"
          size="icon"
          className={cn("w-full h-full text-2xl", isPlaying && "text-blue-500 animate-pulse")}
          onClick={(e) => {
            e.stopPropagation();
            play();
          }}
        >
          <Volume2 className={cn("h-6 w-6")} />
        </Button>
      </div>
    );
  }
);

SpeakerButton.displayName = 'SpeakerButton';
