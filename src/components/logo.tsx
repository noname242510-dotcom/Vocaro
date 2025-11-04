import Link from 'next/link';
import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
    iconOnly?: boolean;
}

export function Logo({ className, iconOnly = false }: LogoProps) {
    const content = iconOnly ? (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-full w-full"
        >
          <path d="M5 3l7 18 7-18" />
        </svg>
    ) : (
        <span className="font-bold font-headline tracking-wider">Vocaro</span>
    );
  
  if (iconOnly) {
    return <div className={cn("text-primary", className)}>{content}</div>
  }

  return (
    <Link href="/dashboard" className={cn("flex items-center justify-center text-primary", className)}>
      {content}
    </Link>
  );
}
