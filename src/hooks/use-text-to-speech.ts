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
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      
      // Create a single utterance instance and reuse it.
      const utterance = new SpeechSynthesisUtterance();
      utteranceRef.current = utterance;

      const handleEnd = () => {
        setIsPlaying(false);
      };

      const handleError = (event: SpeechSynthesisErrorEvent) => {
        // The 'interrupted' error is expected and normal when speech is cancelled.
        // We should not log this as an error in the console.
        if (event.error !== 'interrupted') {
          // console.error('SpeechSynthesisUtterance.onerror', event);
        }
        setIsPlaying(false); // Always reset playing state on any error
      };

      utterance.addEventListener('end', handleEnd);
      utterance.addEventListener('error', handleError);

      // Cleanup function to remove listeners and cancel speech when the component unmounts.
      return () => {
        utterance.removeEventListener('end', handleEnd);
        utterance.removeEventListener('error', handleError);
        window.speechSynthesis.cancel();
      };
    }
  }, []); // This effect runs only once to set up the utterance and listeners

  const speak = useCallback((text: string, languageHint: string) => {
    const ttsEnabled = localStorage.getItem('tts-enabled') === 'true';
    if (!isSupported || !utteranceRef.current || !ttsEnabled) {
      return;
    }
    
    // Always cancel any ongoing speech before starting a new one. This prevents overlaps.
    window.speechSynthesis.cancel();
    
    const utterance = utteranceRef.current;
    const languageCode = getLanguageCode(languageHint);
    
    utterance.text = expandAbbreviation(text, languageCode);
    utterance.lang = languageCode;
    utterance.rate = 0.85;

    const preferredVoiceURI = localStorage.getItem('tts-voice-uri');
    const voices = window.speechSynthesis.getVoices();
    let chosenVoice = null;

    if (preferredVoiceURI) {
        chosenVoice = voices.find(voice => voice.voiceURI === preferredVoiceURI);
    }
    
    // If no preferred voice or preferred voice not found, try to find a matching language voice.
    if (!chosenVoice && voices.length > 0) {
        // Prefer non-local voices as they often have better quality.
        chosenVoice = voices.find(voice => voice.lang === languageCode && !voice.localService) || voices.find(voice => voice.lang === languageCode);
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    } else {
      utterance.voice = null; // Reset to browser default if no suitable voice is found
    }
    
    setIsPlaying(true); // Manually set playing to true before speaking
    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, [isSupported]);

  return { speak, cancel, isPlaying, isSupported };
};
