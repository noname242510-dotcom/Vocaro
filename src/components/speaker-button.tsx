'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Loader2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { textToSpeech } from '@/ai/flows/text-to-speech';

interface SpeakerButtonProps {
  text: string;
  languageHint?: string;
  className?: string;
}

export const SpeakerButton = forwardRef<{ play: () => void }, SpeakerButtonProps>(
  ({ text, languageHint, className }, ref) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [playbackDuration, setPlaybackDuration] = useState(2000);

    const getLanguageCode = (hint: string): string => {
      const lowerHint = hint.toLowerCase();
      if (lowerHint.includes('französisch') || lowerHint.includes('french')) return 'fr-FR';
      if (lowerHint.includes('spanisch') || lowerHint.includes('spanish')) return 'es-ES';
      if (lowerHint.includes('italienisch') || lowerHint.includes('italian')) return 'it-IT';
      if (lowerHint.includes('portugiesisch') || lowerHint.includes('portuguese')) return 'pt-BR';
      if (lowerHint.includes('russisch') || lowerHint.includes('russian')) return 'ru-RU';
      if (lowerHint.includes('englisch') || lowerHint.includes('english')) return 'en-US';
      return 'en-US'; // Default
    };

    const handlePlay = async (e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();

      if (isLoading) return;

      // If audio is already loaded, just play it again.
      if (audioRef.current && audioRef.current.src && !isPlaying) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        return;
      }
      
      // If we click while playing, restart playback.
      if (audioRef.current && isPlaying) {
          audioRef.current.currentTime = 0;
          audioRef.current.play();
          
          // Restart animation
          setIsPlaying(false);
          if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
          setTimeout(() => {
              setIsPlaying(true);
              animationTimeoutRef.current = setTimeout(() => setIsPlaying(false), playbackDuration);
          }, 50);

          return;
      }


      setIsLoading(true);
      try {
        const langCode = languageHint ? getLanguageCode(languageHint) : undefined;
        const result = await textToSpeech({ text, languageCode });
        
        if (result.media) {
          if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.onloadedmetadata = () => {
              const duration = (audioRef.current?.duration ?? 2) * 1000;
              setPlaybackDuration(duration);
            };
            audioRef.current.onplay = () => {
              setIsPlaying(true);
              animationTimeoutRef.current = setTimeout(() => setIsPlaying(false), playbackDuration);
            };
            audioRef.current.onended = () => {
              setIsPlaying(false);
              if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
            };
            audioRef.current.onpause = () => {
                setIsPlaying(false);
                if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
            };
          }
          audioRef.current.src = result.media;
          audioRef.current.play();
        }
      } catch (error) {
        console.error("TTS Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      play: () => {
        handlePlay();
      },
    }));

    useEffect(() => {
      return () => {
        if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }, []);

    return (
      <div className={cn("relative h-10 w-10", className)}>
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-full text-muted-foreground hover:text-foreground"
          onClick={handlePlay}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
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
            className={cn("stroke-primary transition-all", isPlaying ? 'opacity-100' : 'opacity-0')}
            strokeWidth="2"
            strokeDasharray="100"
            strokeDashoffset={isPlaying ? 0 : 100}
            style={{
              transition: isPlaying ? `stroke-dashoffset ${playbackDuration}ms linear` : 'none',
            }}
          />
        </svg>
      </div>
    );
  }
);

SpeakerButton.displayName = 'SpeakerButton';
