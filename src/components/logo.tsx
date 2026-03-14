import Link from 'next/link';
import { cn } from "@/lib/utils";
import Image from 'next/image';

interface LogoProps {
    className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link href="/dashboard" className={cn("flex items-center justify-center", className)}>
      <Image src="/icon.png" alt="Vocaro Logo" width={40} height={40} />
    </Link>
  );
}
