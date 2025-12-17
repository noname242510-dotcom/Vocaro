'use client';

import { useState, useEffect, useCallback } from 'react';

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

// A simple utility to expand common abbreviations
const expandAbbreviation = (text: string, langCode: string): string => {
    if (langCode === 'fr-FR') {
        return text.replace(/\b(qn)\b/g, 'quelqu\'un').replace(/\b(qc)\b/g, 'quelque chose');
    }
    // Add other languages as needed
    return text;
};


export const useTextToSpeech = (): UseTextToSpeechReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
            setVoices(availableVoices);
        }
      };

      loadVoices();
      // The 'voiceschanged' event is crucial for ensuring voices are loaded.
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  const speak = useCallback((text: string, languageHint: string) => {
    if (!isSupported || voices.length === 0) {
        console.warn("Speech Synthesis not supported or voices not loaded yet.");
        return;
    }
    
    // Always cancel any ongoing speech before starting a new one
    window.speechSynthesis.cancel();

    const languageCode = getLanguageCode(languageHint);
    const expandedText = expandAbbreviation(text, languageCode);
    const utterance = new SpeechSynthesisUtterance(expandedText);
    
    utterance.lang = languageCode;
    utterance.rate = 0.85;

    // Find the best voice for the given language
    const bestVoice = voices.find(voice => voice.lang === languageCode && !voice.localService) || voices.find(voice => voice.lang === languageCode);
    if (bestVoice) {
      utterance.voice = bestVoice;
    } else {
        console.warn(`No voice found for language: ${languageCode}`);
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = (event) => {
        if (event.error !== 'interrupted') {
          console.error('SpeechSynthesisUtterance.onerror', event);
        }
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
