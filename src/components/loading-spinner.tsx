import { cn } from '@/lib/utils';

export function LoadingSpinner({ className, fullPage = false }: { className?: string; fullPage?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullPage
          ? "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 ml-[280px]"
          : "w-full py-20",
        className
      )}
    >
      <div className="flex items-center justify-center space-x-2">
        <div className="w-4 h-4 rounded-full bg-primary bounce-1"></div>
        <div className="w-4 h-4 rounded-full bg-primary bounce-2"></div>
        <div className="w-4 h-4 rounded-full bg-primary bounce-3"></div>
      </div>
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">
        Lade...
      </p>
    </div>
  );
}
