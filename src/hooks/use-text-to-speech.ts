'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseTextToSpeechReturn {
  speak: (text: string, lang: string) => void;
  cancel: () => void;
  isPlaying: boolean;
  isSupported: boolean;
}

// A simple map to get language codes
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
  return 'en-US'; // Default fallback
};


export const useTextToSpeech = (): UseTextToSpeechReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      const loadVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      // Load voices initially and on change
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  const speak = useCallback((text: string, languageHint: string) => {
    if (!isSupported) {
      console.warn("Speech Synthesis not supported by this browser.");
      return;
    }
    
    // If currently speaking, cancel the previous utterance
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    
    const languageCode = getLanguageCode(languageHint);
    utterance.lang = languageCode;
    utterance.rate = 0.85; // Slightly slower speed for clarity

    // Find a suitable voice
    const bestVoice = voices.find(voice => voice.lang === languageCode && !voice.localService) || voices.find(voice => voice.lang === languageCode);
    if (bestVoice) {
      utterance.voice = bestVoice;
    } else {
        console.warn(`No voice found for language: ${languageCode}`);
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror', event);
        setIsPlaying(false);
    };

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
