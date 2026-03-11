'use client';

import { Home, Settings, Sun, Moon, LayoutDashboard, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { collection } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { GlobalVerbResultListener } from '@/components/global-verb-result-listener';
import { TaskProgressToast } from '@/components/task-progress-toast';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Subject } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TaskProvider } from '@/contexts/task-context';
import { SettingsProvider, useSettings } from '@/contexts/settings-context';
import { NavBar } from '@/components/nav-bar';
import { UserNav } from '@/components/user-nav';


function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, firestore, auth } = useFirebase();
  const { settings, updateSettings, isLoading: areSettingsLoading } = useSettings();

  const isImmersiveMode = pathname.includes('/learn');

  const subjectsCollection = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects');
  }, [firestore, user]);

  const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsCollection);


  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    if (settings) {
      updateSettings({ darkMode: !settings.darkMode });
    }
  };

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/dashboard/stacks', icon: LayoutDashboard, label: 'Flashcards' },
    { href: '/dashboard/community', icon: Users, label: 'Community' },
    { href: '/dashboard/overview', icon: LayoutDashboard, label: 'Statistiken' },
    { href: '/dashboard/settings', icon: Settings, label: 'Einstellungen' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden">
      <FirebaseErrorListener />
      <GlobalVerbResultListener />
      <TaskProgressToast />

      {/* Sidebar - Desktop */}
      {!isImmersiveMode && (
        <aside className="hidden md:flex flex-col w-72 bg-card border-r border-border h-screen sticky top-0">
          <div className="p-8 pb-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl">
                <Logo iconOnly className="h-6 w-6 brightness-0 invert" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl tracking-tight font-headline">Vocaro</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Master new words</span>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-4 py-8 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start rounded-xl h-12 px-4 gap-3 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "")} />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="p-6">
            {mounted && !areSettingsLoading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="w-full justify-start rounded-xl h-10 px-4 mb-4 text-muted-foreground"
              >
                {settings?.darkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                {settings?.darkMode ? 'Light Mode' : 'Dark Mode'}
              </Button>
            )}
            <Button size="lg" className="w-full rounded-2xl h-14 font-bold gap-2 shadow-xl shadow-primary/10">
              <span className="text-xl">+</span>
              Neues Set
            </Button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        {!isImmersiveMode && (
          <header className="md:hidden flex items-center justify-between p-4 border-b bg-card">
            <Logo className="text-xl" />
            <UserNav />
          </header>
        )}

        <main className={cn(
          "flex-1 overflow-y-auto p-4 md:p-12",
          !isImmersiveMode && "bg-background"
        )}>
          {!isImmersiveMode && (
            <div className="max-w-7xl mx-auto flex justify-end mb-8 items-center gap-4">
              <UserNav />
            </div>
          )}
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Nav */}
      {!isImmersiveMode && (
        <div className="md:hidden">
          <NavBar subjects={subjects ?? null} isLoadingSubjects={areSubjectsLoading} />
        </div>
      )}
    </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TaskProvider>
      <SettingsProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </SettingsProvider>
    </TaskProvider>
  );
}
