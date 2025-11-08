'use client';

import React, { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SettingsLayoutProps {
  menu: ReactNode;
  children: ReactNode;
  showMenuOnMobile: boolean;
  onMobileBack: () => void;
}

export function SettingsLayout({ menu, children, showMenuOnMobile, onMobileBack }: SettingsLayoutProps) {
  const isMobile = useIsMobile();
  const router = useRouter();

  if (isMobile) {
    if (showMenuOnMobile) {
      return (
         <div>
          <h1 className="text-xl font-bold font-headline mb-4">Einstellungen</h1>
          {menu}
        </div>
      );
    }
    // Show detail view
    return (
      <div>
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="icon" onClick={onMobileBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-12">
      <aside>{menu}</aside>
      <main>{children}</main>
    </div>
  );
}
