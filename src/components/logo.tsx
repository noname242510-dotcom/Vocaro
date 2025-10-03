import { cn } from "@/lib/utils";
import { BookOpenText } from "lucide-react";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 text-primary", className)}>
      <BookOpenText className="h-6 w-6" />
      <span className="text-xl font-bold font-headline tracking-wider">Vocaro</span>
    </div>
  );
}
