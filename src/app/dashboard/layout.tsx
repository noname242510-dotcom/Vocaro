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

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
    router.push('/');
  };

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Home' },
    { href: '/dashboard/overview', icon: LayoutDashboard, label: 'Statistiken' },
    { href: '/dashboard/social', icon: Users, label: 'Social' },
    { href: '/dashboard/settings', icon: Settings, label: 'Einstellungen' },
  ];

  const getInitials = (name: string | null | undefined) => {
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const isSubjectsActive = pathname.startsWith('/dashboard/subjects') || pathname === '/dashboard';

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0">
      <FirebaseErrorListener />
      <GlobalVerbResultListener />
      <TaskProgressToast />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {mounted && !areSettingsLoading && (
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
                {settings?.darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}
            <div className="hidden md:block">
              <Logo className="text-2xl" />
            </div>
          </div>

          <div className="md:hidden">
            <Logo className="text-2xl" />
          </div>

          <div className="flex items-center gap-2">
            <UserNav />
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 sticky top-16 h-[calc(100vh-4rem)] border-r p-6 overflow-y-auto">
          <nav className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-4">Navigation</h3>
              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={pathname === item.href ? 'secondary' : 'ghost'}
                      className={cn(
                        "w-full justify-start rounded-xl h-11 px-4",
                        pathname === item.href && "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between px-4 mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fächer</h3>
                <Link href="/dashboard" className="text-xs text-primary hover:underline">Alle</Link>
              </div>
              <div className="space-y-1">
                {areSubjectsLoading ? (
                  <div className="px-4 py-2 space-y-2">
                    <div className="h-8 bg-muted animate-pulse rounded-lg w-full" />
                    <div className="h-8 bg-muted animate-pulse rounded-lg w-full" />
                  </div>
                ) : (
                  subjects?.slice(0, 6).map((subject) => (
                    <Link key={subject.id} href={`/dashboard/subjects/${subject.id}`}>
                      <Button
                        variant={pathname === `/dashboard/subjects/${subject.id}` ? 'secondary' : 'ghost'}
                        className={cn(
                          "w-full justify-start rounded-xl h-11 px-4",
                          pathname === `/dashboard/subjects/${subject.id}` && "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                      >
                        <span className="mr-3 text-lg">{subject.emoji}</span>
                        <span className="truncate">{subject.name}</span>
                      </Button>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* Mobile Bottom NavBar */}
      <NavBar subjects={subjects ?? null} isLoadingSubjects={areSubjectsLoading} />
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
