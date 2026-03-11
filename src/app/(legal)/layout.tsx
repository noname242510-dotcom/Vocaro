'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function LegalLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
        </div>
        <div className="space-y-6 text-foreground/80 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-foreground [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:underline [&_a]:text-primary">
            {children}
        </div>
    </div>
  );
}
