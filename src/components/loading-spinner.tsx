'use client';

import { cn } from '@/lib/utils';

/**
 * A monochrome, centered loading spinner that accounts for the desktop sidebar.
 * The `fullPage` prop centers within the viewport minus the sidebar (desktop).
 */
export function LoadingSpinner({ className, fullPage = false }: { className?: string; fullPage?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullPage
          ? "fixed inset-0 md:left-64 bg-background/80 backdrop-blur-sm z-10"
          : "absolute inset-0",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-foreground animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
          />
        ))}
      </div>
    </div>
  );
}
