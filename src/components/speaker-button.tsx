'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { textToSpeech, TextToSpeechInput } from '@/ai/flows/text-to-speech';

interface SpeakerButtonProps {
  text: string;
  isFlipped: boolean;
  isFront: boolean;
  autoPlay: boolean;
  languageHint: string;
  className?: string;
}

// Global cache to store audio data URIs and promises
const audioCache = new Map<string, Promise<string>>();

const languageCodeMap: Record<string, string> = {
    '🇩🇪': 'de-DE', 'Deutsch': 'de-DE',
    '🇬🇧': 'en-GB', 'Englisch': 'en-GB', 'English': 'en-US',
    '🇫🇷': 'fr-FR', 'Französisch': 'fr-FR', 'French': 'fr-FR',
    '🇪🇸': 'es-ES', 'Spanisch': 'es-ES', 'Spanish': 'es-ES',
    '🇵🇹': 'pt-PT', 'Portugiesisch': 'pt-PT',
    '🇮🇹': 'it-IT', 'Italienisch': 'it-IT',
    '🇷🇺': 'ru-RU', 'Russisch': 'ru-RU',
    '🇬🇷': 'el-GR', 'Griechiesch': 'el-GR',
    '🇯🇵': 'ja-JP', 'Japanisch': 'ja-JP',
    '🏛️': 'la', 'Latein': 'la',
};

function getLanguageCode(hint: string): string | undefined {
    // Check for emoji first
    for (const key in languageCodeMap) {
        if (hint.includes(key)) {
            return languageCodeMap[key];
        }
    }
    return undefined; // Default or no match
}


const getAudioData = async (text: string, languageCode?: string): Promise<string> => {
    const cacheKey = `${languageCode}:${text}`;

    if (audioCache.has(cacheKey)) {
        return audioCache.get(cacheKey)!;
    }
    
    // First, try to get from localStorage for persistence across sessions
    try {
        const storedData = localStorage.getItem(cacheKey);
        if (storedData) {
            const promise = Promise.resolve(storedData);
            audioCache.set(cacheKey, promise); // Populate in-memory cache
            return promise;
        }
    } catch (e) {
        console.warn("Could not access localStorage for TTS cache.", e);
    }

    const audioPromise = new Promise<string>(async (resolve, reject) => {
        try {
            const result = await textToSpeech({ text, languageCode });
            if (result.media) {
                 try {
                    localStorage.setItem(cacheKey, result.media);
                } catch (e) {
                    console.warn("Could not write to localStorage for TTS cache.", e);
                }
                resolve(result.media);
            } else {
                reject(new Error("No media returned from TTS service."));
            }
        } catch (error) {
            reject(error);
        }
    });

    audioCache.set(cacheKey, audioPromise);
    
    // In case of error, remove the failed promise from cache to allow retries
    audioPromise.catch(() => {
        audioCache.delete(cacheKey);
    });

    return audioPromise;
};


export const SpeakerButton = ({ text, isFlipped, isFront, autoPlay, languageHint, className }: SpeakerButtonProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasPlayedOnceRef = useRef(false);

  const languageCode = getLanguageCode(languageHint);

  const play = async () => {
    if (isLoading || isPlaying) return;

    if (audioSrc && audioRef.current) {
      setIsPlaying(true);
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      setIsLoading(true);
      try {
        const dataUrl = await getAudioData(text, languageCode);
        setAudioSrc(dataUrl);
      } catch (error) {
        console.error("TTS Error:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Effect to play audio once it's loaded
  useEffect(() => {
    if (audioSrc && audioRef.current && isLoading) { // Only play automatically after loading
        setIsPlaying(true);
        audioRef.current.src = audioSrc;
        audioRef.current.play();
        hasPlayedOnceRef.current = true;
    }
  }, [audioSrc, isLoading]);
  
  // Effect for autoplay
  useEffect(() => {
    // Determine if the card is on the side that should speak
    const shouldSpeak = isFront; 

    if (isFlipped && shouldSpeak && autoPlay && !hasPlayedOnceRef.current) {
        play();
    }
    
    // Reset state when card is flipped back to the front
    if (!isFlipped) {
        hasPlayedOnceRef.current = false;
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped, isFront, autoPlay]);

  // Handle audio ending
  useEffect(() => {
    const audio = audioRef.current;
    const handleAudioEnd = () => setIsPlaying(false);
    audio?.addEventListener('ended', handleAudioEnd);
    return () => audio?.removeEventListener('ended', handleAudioEnd);
  }, []);

  return (
    <div className={cn("relative h-10 w-10", className)}>
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-full text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            play();
          }}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5" />}
        </Button>
        <svg
            className="absolute top-0 left-0 w-full h-full -rotate-90 pointer-events-none"
            viewBox="0 0 36 36"
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                className={cn(
                    "stroke-primary transition-all",
                    isPlaying ? 'opacity-100' : 'opacity-0'
                )}
                strokeWidth="2"
                strokeDasharray="100"
                strokeDashoffset={isPlaying ? 0 : 100}
                style={{
                    transition: isPlaying && audioRef.current?.duration ? `stroke-dashoffset ${audioRef.current.duration}s linear` : 'none',
                }}
            />
        </svg>
        <audio ref={audioRef} className="hidden" />
    </div>
  );
};
