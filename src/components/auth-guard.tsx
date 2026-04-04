'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { LoadingSpinner } from './loading-spinner';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard ensures that only authenticated users can access the dashboard.
 * It handles the loading state of the Firebase Auth and redirects to '/' 
 * if no user is found after initialization.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isUserLoading } = useFirebase();
  const router = useRouter();

  // We removed the automatic router.replace('/') so that we can see the "Sitzung fehlgeschlagen" UI
  // if the session drops, rather than being mysteriously kicked to the home screen.
  if (isUserLoading) {
    return <LoadingSpinner fullPage />;
  }

  // If there's no user after loading, show an explicit session loss message instead of silently redirecting.
  // This helps us debug if the app is crashing (reloading) vs Firebase Auth dropping the session.
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-3xl flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-black mb-2">Sitzung fehlgeschlagen</h1>
        <p className="text-muted-foreground mb-8 text-lg max-w-sm">
          Deine Anmeldung konnte nicht verifiziert werden. Bitte melde dich erneut an.
        </p>
        <button 
          onClick={() => router.replace('/')} 
          className="bg-primary text-primary-foreground font-bold px-8 py-4 rounded-2xl active:scale-95 transition-transform"
        >
          Zurück zur Anmeldung
        </button>
      </div>
    );
  }

  // If authenticated, render children
  return <>{children}</>;
}
