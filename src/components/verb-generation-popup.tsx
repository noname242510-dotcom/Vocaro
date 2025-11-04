'use client';

import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Logo } from './logo';

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
          'glass-effect',
          error ? 'bg-destructive/10 border-destructive/50' : 'border-glass-border'
        )}
      >
        <div className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse">
            <Logo iconOnly={true} />
        </div>
        <h3 className="text-lg font-bold font-headline mb-2 truncate">{verb}</h3>
        
        {error ? (
            <>
                <p className="text-destructive font-medium mb-4">{error}</p>
                <Button onClick={onClose} variant="destructive">Schließen</Button>
            </>
        ) : (
            <>
                <p className="text-muted-foreground text-sm mt-1 mb-4 h-5">
                  {statusText}
                </p>
                <Progress value={undefined} className="w-full h-1 indeterminate" />
                <p className="text-xs text-muted-foreground/50 mt-2">Current: AI Magic</p>
            </>
        )}
      </div>
       <style jsx>{`
        .indeterminate {
            animation: indeterminate-progress 1.5s infinite;
        }
        @keyframes indeterminate-progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .indeterminate > div {
            width: 50%;
            background: hsl(var(--primary));
        }
      `}</style>
    </div>
  );
}
