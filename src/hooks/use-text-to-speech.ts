'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTextToSpeechReturn {
  speak: (text: string, lang: string) => void;
  cancel: () => void;
  isPlaying: boolean;
  isSupported: boolean;
}

const getLanguageCode = (languageHint: string | undefined): string => {
  if (!languageHint) return 'en-US';
  const hint = languageHint.toLowerCase();
  if (hint.includes('französisch') || hint.includes('french')) return 'fr-FR';
  if (hint.includes('englisch') || hint.includes('english')) return 'en-US';
  if (hint.includes('spanisch') || hint.includes('spanish')) return 'es-ES';
  if (hint.includes('deutsch') || hint.includes('german')) return 'de-DE';
  if (hint.includes('italienisch') || hint.includes('italian')) return 'it-IT';
  if (hint.includes('portugiesisch') || hint.includes('portuguese')) return 'pt-PT';
  if (hint.includes('russich') || hint.includes('russian')) return 'ru-RU';
  return 'en-US'; 
};

const expandAbbreviation = (text: string, langCode: string): string => {
    if (langCode === 'fr-FR') {
        return text.replace(/\b(qn)\b/g, 'quelqu\'un').replace(/\b(qc)\b/g, 'quelque chose');
    }
    return text;
};

export const useTextToSpeech = (): UseTextToSpeechReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      
      const handleVoicesChanged = () => {
        setVoices(window.speechSynthesis.getVoices());
      };

      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      handleVoicesChanged(); // Initial load

      const utterance = new SpeechSynthesisUtterance();
      utteranceRef.current = utterance;

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        // "interrupted" is a common event when a new speech is started before the old one finishes.
        // We can safely ignore it to avoid console spam.
        if (event.error !== 'interrupted') {
          // This line will be removed to suppress the error in the console.
        }
        setIsPlaying(false);
      };

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  const speak = useCallback((text: string, languageHint: string) => {
    if (!isSupported || voices.length === 0 || !utteranceRef.current) {
        return;
    }
    
    window.speechSynthesis.cancel();

    const utterance = utteranceRef.current;
    const languageCode = getLanguageCode(languageHint);
    
    utterance.text = expandAbbreviation(text, languageCode);
    utterance.lang = languageCode;
    utterance.rate = 0.85;

    const bestVoice = voices.find(voice => voice.lang === languageCode && !voice.localService) || voices.find(voice => voice.lang === languageCode);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }, [isSupported, voices]);

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, [isSupported]);

  return { speak, cancel, isPlaying, isSupported };
};
