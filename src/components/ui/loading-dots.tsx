import { cn } from '@/lib/utils';

const LoadingDots = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center justify-center space-x-1', className)}>
      <div className="h-2 w-2 animate-bounce rounded-full bg-black dark:bg-white [animation-delay:-0.3s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-black dark:bg-white [animation-delay:-0.15s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-black dark:bg-white" />
    </div>
  );
};

export default LoadingDots;