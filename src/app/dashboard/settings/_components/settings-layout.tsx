'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
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
<<<<<<< HEAD

  const headerContent = (
    <div className="flex items-center gap-2 mb-4">
      <Button variant="ghost" size="icon" className="-ml-2" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-xl font-bold font-headline">Einstellungen</h1>
    </div>
  );
=======
>>>>>>> d6b92db (der zurück button soll zur letzten aufgerufenen seite vor den einstellun)

  const headerContent = (
    <div className="flex items-center gap-2 mb-4">
      <Button variant="ghost" size="icon" className="-ml-2" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-xl font-bold font-headline">Einstellungen</h1>
    </div>
  );

  if (isMobile) {
    if (showMenuOnMobile) {
      return (
         <div>
          {headerContent}
          {menu}
        </div>
      );
    }
    // Show detail view (the selected section's content)
    return (
      <div>
        <div className="flex items-center mb-4 -ml-2">
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
    <div className="relative">
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-12">
        <aside>
          {headerContent}
=======
       <Button variant="ghost" size="icon" className="absolute -left-16 top-0" asChild>
        <Link href="/dashboard">
=======
       <Button variant="ghost" size="icon" className="absolute -left-16 top-0" onClick={() => router.back()}>
>>>>>>> d6b92db (der zurück button soll zur letzten aufgerufenen seite vor den einstellun)
          <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-12">
        <aside>
          <h1 className="text-xl font-bold font-headline mb-4">Einstellungen</h1>
>>>>>>> 29e8e48 (füge einen zurück button in den einstellungen links oben ein, der sich ü)
=======
      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-12">
        <aside>
<<<<<<< HEAD
          <div className="flex items-center gap-2 mb-4">
             <Button variant="ghost" size="icon" className="-ml-2" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold font-headline">Einstellungen</h1>
          </div>
>>>>>>> 9f3ead0 (der button wird nicht angezeigt)
=======
          {headerContent}
>>>>>>> 85533a2 (mach jetzt)
          {menu}
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
