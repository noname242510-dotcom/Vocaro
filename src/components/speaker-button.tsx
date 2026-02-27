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
  ttsEnabled: boolean;
  autoplayEnabled: boolean;
}

const prepareTextForSpeech = (input: string, lang: string): string => {
  let cleaned = input.replace(/[()]/g, '');
  const langPrefix = lang.split('-')[0].toLowerCase();

  const replacements: Record<string, Record<string, string>> = {
    en: {
      'sb': 'somebody',
      'sth': 'something',
      'swh': 'somewhere',
      'qn': 'someone',
      'qc': 'something',
      'adj': 'adjective',
      'adv': 'adverb',
      'prep': 'preposition',
      'v': 'verb',
      'n': 'noun'
    },
    fr: {
      'qqn': 'quelqu’un',
      'qqch': 'quelque chose',
      'qn': 'quelqu’un',
      'qc': 'quelque chose',
      'qcq': 'quelconque',
      'adj': 'adjectif',
      'adv': 'adverbe',
      'v': 'verbe',
      'n': 'nom'
    },
    de: {
      'jmd': 'jemand',
      'jmdm': 'jemandem',
      'jmdn': 'jemanden',
      'jmds': 'jemandes',
      'etw': 'etwas',
      'bzw': 'beziehungsweise',
      'u.a': 'unter anderem',
      'v.a': 'vor allem',
      'adj': 'adjektiv',
      'adv': 'adverb'
    },
    es: {
      'algn': 'alguien',
      'algo': 'algo',
      'adj': 'adjetivo',
      'adv': 'adverbio',
      'v': 'verbo',
      's': 'sustantivo'
    },
    it: {
      'qc': 'qualcosa',
      'qn': 'qualcuno',
      'adj': 'aggettivo',
      'adv': 'avverbio'
    },
    pt: {
      'alg': 'alguém',
      'algo': 'algo',
      'adj': 'adjetivo',
      'adv': 'advérbio'
    }
  };

  const langMap = replacements[langPrefix];
  if (langMap) {
    for (const [abbr, full] of Object.entries(langMap)) {
      cleaned = cleaned.replace(new RegExp(`\\b${abbr}\\b`, 'gi'), full);
    }
  }

  return cleaned.trim().replace(/\s+/g, ' ');
};

export const SpeakerButton = forwardRef<{ play: () => void }, SpeakerButtonProps>(
  ({ text, languageHint, className, autoplay, ttsEnabled, autoplayEnabled }, ref) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
    const lastTextRef = useRef<string>("");

    useEffect(() => {
      if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

      const loadVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        if (window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = null;
          window.speechSynthesis.cancel();
        }
      };
    }, [ttsEnabled]);

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
    
    const play = useCallback(() => {
      if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis || !text) return;
      
      if (voicesRef.current.length === 0) {
        setTimeout(play, 150);
        return;
      }

      window.speechSynthesis.cancel();
      
      const langCode = getLanguageCode(languageHint);
      const processedText = prepareTextForSpeech(text, langCode);
      const utterance = new SpeechSynthesisUtterance(processedText);
      utterance.lang = langCode;

      const voices = voicesRef.current;
      const persistedVoiceURI = localStorage.getItem('tts-voice-uri');
      
      let selectedVoice: SpeechSynthesisVoice | null = null;
      
      if (persistedVoiceURI) {
        selectedVoice = voices.find(v => v.voiceURI === persistedVoiceURI) || null;
      }
      
      if (!selectedVoice) {
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
    }, [text, languageHint, ttsEnabled]);

    useImperativeHandle(ref, () => ({ play }));

    useEffect(() => {
        if (autoplayEnabled && autoplay && text && text !== lastTextRef.current) {
            const timer = setTimeout(() => {
                play();
                lastTextRef.current = text;
            }, 200);
            
            return () => clearTimeout(timer);
        }
    }, [autoplayEnabled, autoplay, text, play]);

    if (!ttsEnabled) {
      return null; 
    }

    return (
      <div className={cn("relative h-10 w-10", className)}>
         <Button
          variant="ghost"
          size="icon"
          className={cn("w-full h-full text-2xl")}
          onClick={(e) => {
            e.stopPropagation();
            play();
          }}
          aria-label="Play pronunciation"
        >
          <Volume2 className={cn("h-6 w-6", isPlaying && "animate-pulse")} />
        </Button>
      </div>
    );
  }
);

SpeakerButton.displayName = 'SpeakerButton';
