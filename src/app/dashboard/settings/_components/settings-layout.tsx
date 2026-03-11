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

  if (isMobile) {
    if (showMenuOnMobile) {
      return (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white shadow-xl shadow-primary/5" onClick={() => router.back()}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-3xl font-black font-outfit">Einstellungen</h1>
          </div>
          <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-primary/5">
            {menu}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white shadow-xl shadow-primary/5" onClick={onMobileBack}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </div>
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-primary/5 min-h-[60vh]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="relative animate-in fade-in duration-700">
      <div className="grid grid-cols-[300px_1fr] gap-12 items-start">
        <aside className="sticky top-12 space-y-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-2xl bg-white shadow-xl shadow-primary/5 hover:scale-110 transition-all"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-4xl font-black font-creative">Settings</h1>
          </div>

          <div className="bg-white rounded-[3rem] p-4 shadow-xl shadow-primary/5 border border-primary/5">
            {menu}
          </div>
        </aside>

        <main className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-primary/10 border-none min-h-[80vh]">
          {children}
        </main>
      </div>
    </div>
  );
}