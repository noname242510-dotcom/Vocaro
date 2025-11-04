'use client';

import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface VerbGenerationPopupProps {
  isOpen: boolean;
  verb: string;
  error: string | null;
  onClose: () => void;
  statusText: string;
}

export function VerbGenerationPopup({
  isOpen,
  verb,
  error,
  onClose,
  statusText,
}: VerbGenerationPopupProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div
        className={cn(
          'w-full max-w-sm rounded-2xl p-6 text-center transition-colors duration-300',
          'bg-background border shadow-lg',
          error ? 'border-destructive/50' : 'border-border'
        )}
      >
        <h3 className="text-lg font-semibold mb-2 truncate">{verb}</h3>
        
        {error ? (
            <>
                <p className="text-destructive font-medium mb-4">{error}</p>
                <Button onClick={onClose} variant="destructive">Schließen</Button>
            </>
        ) : (
            <>
                <p className="text-lg font-medium">{statusText}</p>
                <p className="text-muted-foreground text-sm mt-1 mb-4 h-5">
                  {/* Progress details can be added here if needed */}
                </p>
                <Progress value={undefined} className="w-full" />
            </>
        )}
      </div>
    </div>
  );
}
