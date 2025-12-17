'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SpeakerButtonProps {
  text: string;
  isFlipped: boolean;
  isFront: boolean;
  autoPlay: boolean;
  className?: string;
  disabled?: boolean;
}

export const SpeakerButton = ({ text, isFlipped, isFront, autoPlay, className }: SpeakerButtonProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedOnceRef = useRef(false);

  // Estimate duration based on text length. A simple but effective heuristic.
  const DURATION_PER_CHAR = 60; // ms
  const MIN_DURATION = 800; // ms
  const MAX_DURATION = 5000; // ms
  const playbackDuration = Math.max(MIN_DURATION, Math.min(text.length * DURATION_PER_CHAR, MAX_DURATION));

  const play = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    hasPlayedOnceRef.current = true;
    
    if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
    }
    
    animationTimeoutRef.current = setTimeout(() => {
      setIsPlaying(false);
    }, playbackDuration);
  };
  
  // Effect to handle autoplay
  useEffect(() => {
    // We want to autoplay only when the card flips to the designated front side
    if (isFlipped && isFront && autoPlay && !hasPlayedOnceRef.current) {
      play();
    }
    
    // Reset the "has played" flag when the card is flipped away
    if (!isFlipped) {
      hasPlayedOnceRef.current = false;
      setIsPlaying(false);
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    }
    
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped, isFront, autoPlay]);


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
        >
          <Volume2 className="h-5 w-5" />
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
};
