'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 flex h-full items-center justify-center", className)}>
        <Loader2 className="h-24 w-24 animate-spin text-muted-foreground" />
    </div>
  );
}
