'use client';

import { Home, Settings, LogOut, Menu, Sun, Moon, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { collection } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Subject } from '@/lib/types';
import { cn } from '@/lib/utils';

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
  const { user, isUserLoading, firestore } = useFirebase();

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
    if (user) {
      user.auth.signOut();
    }
    router.push('/');
  };

  const navItems = [
    // { href: '/dashboard', icon: Home, label: 'Fächer' },
    { href: '/dashboard/settings', icon: Settings, label: 'Einstellungen' },
  ];

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-4 z-40 flex justify-between items-center h-20 px-4 md:px-6 m-2 md:m-4 rounded-full glass-effect shadow-md">
        <div className="flex-1">
          {mounted && (
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}
        </div>
        <div className="flex-1 text-center">
          <Logo className="text-2xl" />
        </div>
        <div className="flex-1 flex justify-end">
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
                    <CollapsibleTrigger asChild>
                       <Button
                          variant={pathname.startsWith('/dashboard/subjects') || pathname === '/dashboard' ? 'secondary' : 'ghost'}
                          className="w-full justify-between text-lg rounded-full"
                          asChild={false}
                        >
                          <div className="flex items-center">
                           <Home className="mr-4 h-5 w-5" />
                            Fächer
                          </div>
                          <ChevronDown className={cn("h-5 w-5 transition-transform", isSubjectsOpen && "rotate-180")} />
                        </Button>
                    </CollapsibleTrigger>
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
                         <li>
                             <Link href={`/dashboard`} passHref>
                                <Button
                                  variant={pathname === `/dashboard` ? 'secondary' : 'ghost'}
                                  className="w-full justify-start text-base rounded-full"
                                  onClick={() => setIsMenuOpen(false)}
                                >
                                  <span className="mr-4 text-lg"></span>
                                  <span className="truncate text-muted-foreground">Alle Fächer</span>
                                </Button>
                              </Link>
                          </li>
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
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl mr-3">
                  {isUserLoading ? '' : getInitials(user?.displayName, user?.email)}
                </div>
                <div>
                  <p className="font-semibold">{isUserLoading ? 'Laden...' : (user?.displayName || 'Benutzer')}</p>
                  <p className="text-sm text-muted-foreground">{isUserLoading ? '' : user?.email}</p>
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
  );
}
