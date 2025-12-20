
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
    // Add other languages as needed
    return text;
};


export const useTextToSpeech = (): UseTextToSpeechReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      
      // Erstelle eine einzige, wiederverwendbare Instanz der Utterance
      const utterance = new SpeechSynthesisUtterance();
      utteranceRef.current = utterance;

      const handleEnd = () => {
        setIsPlaying(false);
      };

      const handleError = (event: SpeechSynthesisErrorEvent) => {
        // Der 'interrupted'-Fehler ist normal und wird erwartet, wenn eine neue Sprachausgabe startet.
        // Wir protokollieren diesen Fehler nicht, um die Konsole sauber zu halten.
        if (event.error !== 'interrupted') {
          // Echte Fehler könnten hier protokolliert werden, falls nötig.
          // console.error('SpeechSynthesisUtterance.onerror', event);
        }
        setIsPlaying(false); // Spielstatus bei jedem Fehler zurücksetzen
      };

      utterance.addEventListener('end', handleEnd);
      utterance.addEventListener('error', handleError);

      // Aufräumfunktion: Entfernt Listener und bricht die Sprachausgabe ab, wenn die Komponente unmountet.
      return () => {
        utterance.removeEventListener('end', handleEnd);
        utterance.removeEventListener('error', handleError);
        window.speechSynthesis.cancel();
      };
    }
  }, []); // Dieser Effekt läuft nur einmal, um die Utterance und Listener einzurichten.

  const speak = useCallback((text: string, languageHint: string) => {
    const ttsEnabled = localStorage.getItem('tts-enabled') === 'true';
    if (!isSupported || !utteranceRef.current || !ttsEnabled) {
      return;
    }
    
    // Bricht immer eine laufende Ausgabe ab, bevor eine neue gestartet wird.
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
    
    // Wenn keine bevorzugte Stimme gefunden wurde, suche eine passende Stimme zur Sprache.
    if (!chosenVoice && voices.length > 0) {
        // Bevorzuge Stimmen, die nicht lokal sind, da sie oft eine bessere Qualität haben.
        chosenVoice = voices.find(voice => voice.lang === languageCode && !voice.localService) || voices.find(voice => voice.lang === languageCode);
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    } else {
      utterance.voice = null; // Setze auf Browser-Standard zurück, wenn keine passende Stimme gefunden wird
    }
    
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
