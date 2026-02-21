'use client';

import { Home, Settings, LogOut, Menu, Sun, Moon, ChevronDown, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { collection } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { GlobalVerbResultListener } from '@/components/global-verb-result-listener';
import { TaskProgressToast } from '@/components/task-progress-toast';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Subject } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TaskProvider } from '@/contexts/task-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading, firestore, auth } = useFirebase();

  const [isSubjectsOpen, setIsSubjectsOpen] = useState(true);

  const subjectsCollection = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'subjects');
  }, [firestore, user]);

  const { data: subjects, isLoading: areSubjectsLoading } = useCollection<Subject>(subjectsCollection);


  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDarkMode(!isDarkMode);
  };
  
  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
    router.push('/');
  };

  const navItems = [
    { href: '/dashboard/overview', icon: LayoutDashboard, label: 'Statistiken' },
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
    <TaskProvider>
      <div className="min-h-screen bg-background text-foreground">
        <FirebaseErrorListener />
        <GlobalVerbResultListener />
        <TaskProgressToast />
        <header className="relative flex justify-center items-center h-20 px-4 md:px-6 my-2 md:my-4 mx-auto rounded-full glass-effect shadow-md w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] max-w-7xl sticky top-4 z-30">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
              {mounted && (
                  <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>
              )}
          </div>
          <div className="flex-1 text-center">
            <Logo className="text-3xl" />
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Side Menu */}
        <div className={`fixed top-4 right-4 h-[calc(100%-2rem)] w-72 bg-card text-card-foreground shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'} rounded-2xl`}>
          <div className="flex flex-col h-full p-6">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)} className="self-end mb-8">
              <Menu className="h-5 w-5" />
            </Button>
            <nav className="flex-grow">
              <ul>
                  <li className="mb-4">
                    <Collapsible open={isSubjectsOpen} onOpenChange={setIsSubjectsOpen}>
                      <div
                        className={cn(
                          'flex items-center justify-between w-full rounded-full text-lg h-10 px-4',
                          isSubjectsActive ? 'bg-secondary' : 'bg-transparent'
                        )}
                      >
                        <Link
                          href="/dashboard"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center h-full flex-1"
                        >
                          <Home className="mr-4 h-5 w-5" />
                          Fächerübersicht
                        </Link>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className={cn("h-5 w-5 transition-transform", isSubjectsOpen && "rotate-180")} />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <ul className="pl-8 pt-2 space-y-1">
                          {subjects && subjects.map(subject => (
                            <li key={subject.id}>
                               <Link href={`/dashboard/subjects/${subject.id}`} passHref>
                                  <Button
                                    variant={pathname === `/dashboard/subjects/${subject.id}` ? 'secondary' : 'ghost'}
                                    className="w-full justify-start text-base rounded-full"
                                    onClick={() => setIsMenuOpen(false)}
                                  >
                                    <span className="mr-4 text-lg">{subject.emoji}</span>
                                    <span className="truncate">{subject.name}</span>
                                  </Button>
                                </Link>
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  </li>
                {navItems.map(item => (
                  <li key={item.href} className="mb-4">
                    <Link href={item.href} passHref>
                      <Button
                        variant={pathname === item.href ? 'secondary' : 'ghost'}
                        className="w-full justify-start text-lg rounded-full"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <item.icon className="mr-4 h-5 w-5" />
                        {item.label}
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            {/* Account Section */}
            <div className="mt-auto">
               <div className="flex items-center p-2 rounded-full mb-4">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={user?.photoURL ?? undefined} alt={user?.displayName ?? 'Benutzer'} />
                    <AvatarFallback className="font-bold">
                      {isUserLoading ? '' : getInitials(user?.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{isUserLoading ? 'Laden...' : (user?.displayName || 'Benutzer')}</p>
                  </div>
               </div>
              <Button variant="ghost" className="w-full justify-start text-lg rounded-full" onClick={handleLogout}>
                <LogOut className="mr-4 h-5 w-5" />
                Ausloggen
              </Button>
            </div>
          </div>
        </div>
        
         {/* Overlay */}
         {isMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/30 z-50" 
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </TaskProvider>
  );
}
