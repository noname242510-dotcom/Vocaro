'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseTextToSpeechReturn {
  speak: (text: string, langHint?: string) => void;
  cancel: () => void;
  isPlaying: boolean;
  isSupported: boolean;
}

const getLanguageCode = (languageHint?: string): string => {
  if (!languageHint) return 'en-US';
  const hint = languageHint.toLowerCase();
  if (hint.includes('französisch') || hint.includes('french')) return 'fr-FR';
  if (hint.includes('englisch') || hint.includes('english')) return 'en-US';
  if (hint.includes('spanisch') || hint.includes('spanish')) return 'es-ES';
  if (hint.includes('deutsch') || hint.includes('german')) return 'de-DE';
  if (hint.includes('italienisch') || hint.includes('italian')) return 'it-IT';
  if (hint.includes('portugiesisch') || hint.includes('portuguese')) return 'pt-PT';
  if (hint.includes('russisch') || hint.includes('russian')) return 'ru-RU';
  return 'en-US';
};

const expandAbbreviation = (text: string, langCode: string): string => {
  switch (langCode) {
    case 'fr-FR':
      return text.replace(/\b(qn)\b/gi, "quelqu'un").replace(/\b(qc)\b/gi, 'quelque chose');
    case 'en-US':
      return text.replace(/\be\.g\.\b/gi, 'for example').replace(/\bi\.e\.\b/gi, 'that is');
    case 'de-DE':
      return text.replace(/\bz\.B\.\b/gi, 'zum Beispiel').replace(/\bu\.a\.\b/gi, 'unter anderem');
    default:
      return text;
  }
};

export const useTextToSpeech = (): UseTextToSpeechReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      // Chrome lädt Stimmen manchmal verzögert
      window.speechSynthesis.getVoices();
    }
  }, []);

  const speak = useCallback((rawText: string, languageHint?: string) => {
    if (!isSupported || !rawText) return;

    const languageCode = getLanguageCode(languageHint);
    const text = expandAbbreviation(rawText, languageCode).trim();
    if (!text) return;

    // 🔧 WICHTIG: alles vorher abbrechen
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCode;
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Stimme NUR setzen, wenn wirklich vorhanden
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang === languageCode);
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = e => {
      console.error('TTS Fehler:', e);
      setIsPlaying(false);
    };

    // ⏱ Chrome-Safe Delay
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 30);

    // 🔍 Debug (optional)
    console.log('TTS:', {
      text,
      languageCode,
      voices: voices.length,
      voice: matchingVoice?.name
    });

  }, [isSupported]);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, [isSupported]);

  return {
    speak,
    cancel,
    isPlaying,
    isSupported
  };
};