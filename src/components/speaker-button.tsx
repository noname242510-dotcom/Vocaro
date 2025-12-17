'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { textToSpeech } from '@/ai/flows/text-to-speech';

interface SpeakerButtonProps {
  text: string;
  isFlipped: boolean;
  isFront: boolean;
  autoPlay: boolean;
  languageHint: string;
  className?: string;
}

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
    for (const key in languageCodeMap) {
        if (hint.includes(key)) {
            return languageCodeMap[key];
        }
    }
    return undefined;
}

const audioCache = new Map<string, Promise<string>>();

const getAudioData = (text: string, languageCode?: string): Promise<string> => {
    const cacheKey = `${languageCode || 'default'}:${text}`;

    if (audioCache.has(cacheKey)) {
        return audioCache.get(cacheKey)!;
    }

    try {
        const storedData = localStorage.getItem(cacheKey);
        if (storedData) {
            const promise = Promise.resolve(storedData);
            audioCache.set(cacheKey, promise);
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
    
    audioPromise.catch(() => {
        audioCache.delete(cacheKey);
    });

    return audioPromise;
};


export const SpeakerButton = ({ text, isFlipped, isFront, autoPlay, languageHint, className }: SpeakerButtonProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);
  const hasPlayedOnceRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    const audio = new Audio();
    audioRef.current = audio;

    const onEnded = () => {
      if (isMountedRef.current) setIsPlaying(false);
    };
    audio.addEventListener('ended', onEnded);
    
    return () => {
        isMountedRef.current = false;
        if (audio) {
          audio.removeEventListener('ended', onEnded);
          audio.pause();
          audio.src = '';
        }
    };
  }, []);

  const languageCode = getLanguageCode(languageHint);

  const play = async () => {
    if (isLoading || isPlaying) return;
    const audio = audioRef.current;
    if (!audio) return;

    setIsLoading(true);
    try {
        const dataUrl = await getAudioData(text, languageCode);
        if (isMountedRef.current && audio) {
            audio.src = dataUrl;
            setIsPlaying(true);
            await audio.play();
            hasPlayedOnceRef.current = true;
        }
    } catch (error) {
        console.error("TTS Error:", error);
        if(isMountedRef.current) setIsPlaying(false);
    } finally {
        if (isMountedRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    const shouldSpeak = isFlipped && isFront && autoPlay && !hasPlayedOnceRef.current;
    
    if (shouldSpeak) {
      play();
    }
    
    if (!isFlipped && audio) {
      hasPlayedOnceRef.current = false;
      if (isPlaying) {
        audio.pause();
        if (isMountedRef.current) setIsPlaying(false);
      }
      if (audio.currentTime > 0) {
        audio.currentTime = 0;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped, isFront, autoPlay, text]);


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
                    "stroke-primary",
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
    </div>
  );
};
