'use client';

import React, { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SettingsLayoutProps {
  menu: ReactNode;
  children: ReactNode;
  isMobileDetail?: boolean;
  onMobileBack?: () => void;
}

export function SettingsLayout({ menu, children, isMobileDetail, onMobileBack }: SettingsLayoutProps) {
  const isMobile = useIsMobile();
  const router = useRouter();

  const handleBack = () => {
    if (onMobileBack) {
      onMobileBack();
    } else {
      router.back();
    }
  };

  if (isMobile) {
    return (
      <div>
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold font-headline">Einstellungen</h1>
        </div>
        {isMobileDetail ? children : menu}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-12">
      <aside>{menu}</aside>
      <main>{children}</main>
    </div>
  );
}