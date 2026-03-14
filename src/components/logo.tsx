import Link from 'next/link';
import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
    href?: string;
}

export function Logo({ className, href = "/dashboard" }: LogoProps) {
 return (
   <Link href={href} className={cn("flex items-center justify-center group", className)}>
     <span className="text-3xl font-bold font-creative text-foreground group-hover:text-primary transition-colors">
        Vocaro
     </span>
   </Link>
 );
}
