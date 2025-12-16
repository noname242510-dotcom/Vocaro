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
  className?: string;
}

export const SpeakerButton = ({ text, isFlipped, isFront, autoPlay, className }: SpeakerButtonProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedOnceRef = useRef(false);

  const DURATION_PER_CHAR = 60;
  const MIN_DURATION = 800;
  const MAX_DURATION = 5000;
  const playbackDuration = Math.max(MIN_DURATION, Math.min(text.length * DURATION_PER_CHAR, MAX_DURATION));

  const play = async () => {
    if (isLoading || isPlaying) return;

    if (audioSrc && audioRef.current) {
      setIsPlaying(true);
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      hasPlayedOnceRef.current = true;
    } else {
      setIsLoading(true);
      try {
        const result = await textToSpeech(text);
        if (result.media) {
          setAudioSrc(result.media);
          // The effect listening to audioSrc will handle playing
        }
      } catch (error) {
        console.error("TTS Error:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Effect to play audio once it's loaded
  useEffect(() => {
    if (audioSrc && audioRef.current) {
        setIsPlaying(true);
        audioRef.current.src = audioSrc;
        audioRef.current.play();
        hasPlayedOnceRef.current = true;
    }
  }, [audioSrc]);
  
  // Effect for autoplay
  useEffect(() => {
    if (isFlipped && isFront && autoPlay && !hasPlayedOnceRef.current) {
      play();
    }
    
    if (!isFlipped) {
      hasPlayedOnceRef.current = false;
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
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
                    transition: isPlaying ? `stroke-dashoffset ${audioRef.current?.duration ? audioRef.current.duration * 1000 : playbackDuration}ms linear` : 'none',
                }}
            />
        </svg>
        <audio ref={audioRef} className="hidden" />
    </div>
  );
};
