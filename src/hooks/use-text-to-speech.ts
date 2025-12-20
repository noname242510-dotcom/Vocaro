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
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const utterance = new SpeechSynthesisUtterance();
      utteranceRef.current = utterance;

      const handleVoicesChanged = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };

      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      handleVoicesChanged();

      const handleEnd = () => setIsPlaying(false);
      const handleError = (event: SpeechSynthesisErrorEvent) => {
        if (event.error !== 'interrupted') {
          console.error('SpeechSynthesisUtterance.onerror', event);
        }
        setIsPlaying(false);
      };

      utterance.addEventListener('end', handleEnd);
      utterance.addEventListener('error', handleError);
      
      return () => {
        utterance.removeEventListener('end', handleEnd);
        utterance.removeEventListener('error', handleError);
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  const speak = useCallback((text: string, languageHint: string) => {
    const ttsEnabled = localStorage.getItem('tts-enabled') === 'true';
    if (!isSupported || !utteranceRef.current || !ttsEnabled) {
      return;
    }

    window.speechSynthesis.cancel();
    
    const utterance = utteranceRef.current;
    const languageCode = getLanguageCode(languageHint);
    
    utterance.text = expandAbbreviation(text, languageCode);
    utterance.lang = languageCode;
    utterance.rate = 0.85;

    const preferredVoiceURI = localStorage.getItem('tts-voice-uri');
    let chosenVoice: SpeechSynthesisVoice | undefined = undefined;

    if (voicesRef.current.length > 0) {
      if (preferredVoiceURI) {
          chosenVoice = voicesRef.current.find(voice => voice.voiceURI === preferredVoiceURI);
      }
      
      if (!chosenVoice) {
          chosenVoice = voicesRef.current.find(voice => voice.lang === languageCode && !voice.localService) 
                     || voicesRef.current.find(voice => voice.lang === languageCode);
      }
    }

    utterance.voice = chosenVoice || null;
    
    setIsPlaying(true);
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
