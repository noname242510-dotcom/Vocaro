'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';

interface SpeakerButtonProps {
  text: string;
  languageHint?: string;
  className?: string;
}

export const SpeakerButton = forwardRef<{ play: () => void }, SpeakerButtonProps>(
  ({ text, languageHint, className }, ref) => {
    const { speak, isPlaying } = useTextToSpeech();
    const [isAnimating, setIsAnimating] = useState(false);
    const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const DURATION_PER_CHAR = 60;
    const MIN_DURATION = 800;
    const MAX_DURATION = 5000;
    const playbackDuration = Math.max(MIN_DURATION, Math.min(text.length * DURATION_PER_CHAR, MAX_DURATION));

    const handlePlay = (e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();
      
      speak(text, languageHint || 'en-US');

      setIsAnimating(true);
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
      }, playbackDuration);
    };

    useImperativeHandle(ref, () => ({
      play: () => {
        handlePlay();
      },
    }));
    
    useEffect(() => {
        if (!isPlaying) {
            setIsAnimating(false);
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
            }
        }
    }, [isPlaying]);

    useEffect(() => {
      return () => {
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
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
                  className={cn("stroke-primary transition-all", isAnimating ? 'opacity-100' : 'opacity-0')}
                  strokeWidth="2"
                  strokeDasharray="100"
                  strokeDashoffset={isAnimating ? 0 : 100}
                  style={{
                      transition: isAnimating ? `stroke-dashoffset ${playbackDuration}ms linear` : 'none',
                  }}
              />
          </svg>
      </div>
    );
  }
);

SpeakerButton.displayName = 'SpeakerButton';
