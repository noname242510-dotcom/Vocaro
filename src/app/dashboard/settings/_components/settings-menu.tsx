
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { User, Palette, Book, WholeWord, Languages, Shield, Volume2, Database } from 'lucide-react';

interface SettingsMenuProps {
  onSelect: (section: string) => void;
}

const menuItems = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'appearance', label: 'Darstellung', icon: Palette },
  { id: 'tts', label: 'Sprachausgabe', icon: Volume2 },
  { id: 'vocabulary', label: 'Vokabelabfrage', icon: Book },
  { id: 'verbs', label: 'Verbabfrage', icon: WholeWord },
  { id: 'language', label: 'Sprache & System', icon: Languages },
  { id: 'account', label: 'Konto & Datenschutz', icon: Shield },
  { id: 'data', label: 'Daten & Export', icon: Database },
];

export function SettingsMenu({ onSelect }: SettingsMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSection = searchParams.get('section') || 'profile';

  const handleSelect = (id: string) => {
    onSelect(id);
    const params = new URLSearchParams(searchParams);
    params.set('section', id);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <nav className="flex flex-col gap-2">
      {menuItems.map(item => (
        <Button
          key={item.id}
          variant="ghost"
          className={cn(
            "w-full justify-start h-14 rounded-2xl px-6 gap-4 text-base transition-all duration-300",
            currentSection === item.id
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
          onClick={() => handleSelect(item.id)}
        >
          <item.icon className={cn("h-5 w-5", currentSection === item.id ? "text-primary-foreground" : "text-muted-foreground/60")} />
          <span className="font-bold">{item.label}</span>
        </Button>
      ))}
    </nav>
  );
}

