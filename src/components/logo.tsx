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
            viewBox="0 0 200 200"
            className="h-full w-full"
        >
            <g>
                <path 
                    d="M 54.3,31.7 C 62.7,19.3 76.7,16.3 89.1,24.7 L 115.3,42.3 L 64.7,133.3 C 56.3,145.7 42.3,148.7 29.9,140.3 C 17.5,131.9 14.5,117.9 22.9,105.5 L 54.3,31.7 Z" 
                    fill="currentColor" 
                    className="text-gray-400 dark:text-gray-600"
                    style={{
                        transform: 'rotate(-5deg)',
                        transformOrigin: 'center'
                    }}
                />
                <path 
                    d="M 145.7,31.7 C 137.3,19.3 123.3,16.3 110.9,24.7 L 84.7,42.3 L 135.3,133.3 C 143.7,145.7 157.7,148.7 170.1,140.3 C 182.5,131.9 185.5,117.9 177.1,105.5 L 145.7,31.7 Z" 
                    fill="currentColor" 
                    style={{
                        transform: 'rotate(5deg)',
                        transformOrigin: 'center'
                    }}
                />
            </g>
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
