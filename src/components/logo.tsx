import Link from 'next/link';
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/dashboard" className={cn("flex items-center justify-center text-primary", className)}>
      <span className="font-bold font-headline tracking-wider">Vocaro</span>
    </Link>
  );
}
