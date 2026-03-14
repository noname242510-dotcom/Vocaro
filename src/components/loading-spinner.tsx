import { cn } from '@/lib/utils';
import LoadingDots from './ui/loading-dots';

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
      <LoadingDots />
    </div>
  );
}
