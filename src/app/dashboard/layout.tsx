'use client';

import { Home, Settings, Sun, Moon, LayoutDashboard, Users, BookOpen, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { NavBar } from '@/components/nav-bar';
import { UserNav } from '@/components/user-nav';
import { SettingsProvider } from '@/contexts/settings-context';
import { SubjectsCacheProvider, useSubjectsCache } from '@/contexts/subjects-cache-context';
import { TaskProvider } from '@/contexts/task-context';
import { TaskProgressToast } from '@/components/task-progress-toast';
import { GlobalVerbResultListener } from '@/components/global-verb-result-listener';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/dashboard/community', icon: Users, label: 'Community' },
  { href: '/dashboard/facher', icon: BookOpen, label: 'Fächer' },
  { href: '/dashboard/overview', icon: BarChart2, label: 'Statistiken' },
  { href: '/dashboard/settings', icon: Settings, label: 'Einstellungen' },
];

function NavContent() {
  const pathname = usePathname();
  const { subjects, isLoading } = useSubjectsCache();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center justify-between">
        <Logo className="text-2xl" />
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start h-14 rounded-2xl px-5 text-base gap-4 transition-all duration-300',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive ? 'text-primary-foreground' : 'text-muted-foreground/60')} />
                <span className="font-bold">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <UserNav />
      </div>
    </div>
  );
}

function DashboardClientLayout({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isMobile = useIsMobile();
  const { subjects, isLoading: isLoadingSubjects } = useSubjectsCache();
  const pathname = usePathname();
  const isLearnPage = pathname.startsWith('/dashboard/learn');

  if (isMobile) {
    return (
      <div className="pb-32">
        <main>{children}</main>
        {!isLearnPage && <NavBar subjects={subjects} isLoadingSubjects={isLoadingSubjects} />}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-card border-r transition-all duration-300 z-20',
          isExpanded ? 'w-64' : 'w-20',
          isLearnPage && 'w-0 -translate-x-full opacity-0'
        )}
      >
        <NavContent />
      </aside>
      <div className={cn("flex-1 flex flex-col min-h-screen transition-[margin-left]", 
        isLearnPage ? 'md:ml-0' : (isExpanded ? 'md:ml-64' : 'md:ml-20')
      )}>
        <header className={cn("sticky top-0 z-10 h-20 flex items-center justify-end px-8 bg-background/80 backdrop-blur-sm border-b", isLearnPage && 'hidden')}>
           <UserNav />
        </header>
        <main className={cn("flex-1 p-8 md:p-12 pb-28 md:pb-12 bg-secondary/30", isLearnPage && 'p-0 md:p-0 bg-background')}>
          {children}
        </main>
        <TaskProgressToast />
        <GlobalVerbResultListener />
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <TaskProvider>
      <SettingsProvider>
        <SubjectsCacheProvider>
          <DashboardClientLayout>{children}</DashboardClientLayout>
        </SubjectsCacheProvider>
      </SettingsProvider>
    </TaskProvider>
  );
}

    