import { cn } from '@/lib/utils';

export function LoadingSpinner({ className, fullPage = false }: { className?: string; fullPage?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullPage
          ? "fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          : "w-full py-20",
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-spin text-primary opacity-30 h-8 w-8"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">
        Lade...
      </p>
    </div>
  );
}
