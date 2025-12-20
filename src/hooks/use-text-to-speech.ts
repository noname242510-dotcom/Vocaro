'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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

// Abkürzungen für alle unterstützten Sprachen
const expandAbbreviation = (text: string, langCode: string): string => {
  switch (langCode) {
    case 'fr-FR':
      return text
        .replace(/\b(qn)\b/gi, "quelqu'un")
        .replace(/\b(qc)\b/gi, 'quelque chose');
    case 'en-US':
      return text
        .replace(/\be\.g\.\b/gi, 'for example')
        .replace(/\bi\.e\.\b/gi, 'that is');
    case 'de-DE':
      return text
        .replace(/\bz\.B\.\b/gi, 'zum Beispiel')
        .replace(/\bu\.a\.\b/gi, 'unter anderem');
    case 'es-ES':
      return text
        .replace(/\bp\. ej\.\b/gi, 'por ejemplo');
    case 'it-IT':
      return text
        .replace(/\bpe\. es\.\b/gi, 'per esempio');
    case 'pt-PT':
      return text
        .replace(/\bex\.\b/gi, 'por exemplo');
    case 'ru-RU':
      return text
        .replace(/\bт\. е\.\b/gi, 'то есть');
    default:
      return text;
  }
};

export const useTextToSpeech = (): UseTextToSpeechReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const handleVoicesChanged = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };

      handleVoicesChanged();
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  const speak = useCallback((rawText: string, languageHint?: string) => {
    let ttsEnabled = localStorage.getItem('tts-enabled');
    if (ttsEnabled === null) {
      localStorage.setItem('tts-enabled', 'true');
      ttsEnabled = 'true';
    }

    if (!isSupported || ttsEnabled !== 'true' || !rawText) return;

    const languageCode = getLanguageCode(languageHint);
    const text = expandAbbreviation(rawText, languageCode).trim();
    if (!text) return;

    // Cancel laufende Wiedergabe
    window.speechSynthesis.cancel();

    // Neues Utterance für jeden Aufruf
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCode;
    utterance.rate = 0.85;

    // Stimme wählen, falls im LocalStorage gesetzt
    const preferredVoiceURI = localStorage.getItem('tts-voice-uri');
    let chosenVoice: SpeechSynthesisVoice | undefined;

    if (voicesRef.current.length > 0) {
      if (preferredVoiceURI) {
        chosenVoice = voicesRef.current.find(v => v.voiceURI === preferredVoiceURI);
      }
      if (!chosenVoice) {
        chosenVoice = voicesRef.current.find(v => v.lang === languageCode) || undefined;
      }
    }

    if (chosenVoice) utterance.voice = chosenVoice;

    // Eventlistener
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

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