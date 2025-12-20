
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
      
      const utterance = new SpeechSynthesisUtterance();
      utteranceRef.current = utterance;

      const handleEnd = () => setIsPlaying(false);
      const handleError = (event: SpeechSynthesisErrorEvent) => {
        if (event.error !== 'interrupted') {
          // You might want to log other errors for debugging, but not 'interrupted'
        }
        setIsPlaying(false);
      };

      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
            setVoices(availableVoices);
            // Once voices are loaded, we don't need to listen for the event anymore on some browsers.
            // But on others (like Chrome), it's fired every time. Keeping it is safer.
        }
      };

      utterance.addEventListener('end', handleEnd);
      utterance.addEventListener('error', handleError);
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      loadVoices(); // Initial attempt

      return () => {
        utterance.removeEventListener('end', handleEnd);
        utterance.removeEventListener('error', handleError);
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
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
    let chosenVoice: SpeechSynthesisVoice | null = null;

    if (preferredVoiceURI) {
        chosenVoice = voices.find(voice => voice.voiceURI === preferredVoiceURI) || null;
    }
    
    if (!chosenVoice && voices.length > 0) {
        chosenVoice = voices.find(voice => voice.lang === languageCode && !voice.localService) 
                   || voices.find(voice => voice.lang === languageCode)
                   || null;
    }

    utterance.voice = chosenVoice;
    
    setIsPlaying(true);
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
