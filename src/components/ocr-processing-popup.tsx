'use client';

import { Logo } from './logo';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface OcrProcessingPopupProps {
  isOpen: boolean;
  stackName: string;
  progress: number;
  total: number;
  error: string | null;
  onClose: () => void;
  statusText: string;
}

export function OcrProcessingPopup({
  isOpen,
  stackName,
  progress,
  total,
  error,
  onClose,
  statusText,
}: OcrProcessingPopupProps) {
  if (!isOpen) {
    return null;
  }
  
  const percentage = total > 0 ? (progress / total) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div
        className={cn(
          'glass-effect w-full max-w-sm rounded-2xl p-6 text-center transition-colors duration-300',
          error ? 'bg-destructive/10 border-destructive/20' : 'border-glass-border'
        )}
      >
        <h3 className="text-lg font-semibold mb-4 truncate">{stackName}</h3>
        
        <div className="animate-pulse mx-auto w-fit mb-4">
            <Logo iconOnly className="h-12 w-12" />
        </div>

        {error ? (
            <>
                <p className="text-destructive font-medium mb-4">{error}</p>
                <Button onClick={onClose} variant="destructive">Schließen</Button>
            </>
        ) : (
            <>
                <p className="text-lg font-medium">{statusText}</p>
                <p className="text-muted-foreground text-sm mt-1 mb-4 h-5">
                  {/* Text removed as per user request */}
                </p>
                <Progress value={percentage} className="w-full" />
            </>
        )}
      </div>
    </div>
  );
}
