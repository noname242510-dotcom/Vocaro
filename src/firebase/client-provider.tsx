'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './init';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';
import { enableIndexedDbPersistence } from "firebase/firestore";
import type { getSdks } from './init';

type FirebaseServices = Awaited<ReturnType<typeof getSdks>>;

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const services = await initializeFirebase();

        try {
          await setPersistence(services.auth, browserLocalPersistence);
        } catch (error) {
          console.error("Fehler beim Setzen der Auth-Persistence:", error);
        }

        setFirebaseServices(services);
      } catch (err: any) {
        console.error("FirebaseClientProvider: Initialization failed", err);
        setError(err.message || String(err));
      }
    };
    init();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="max-w-md p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Firebase Error</h1>
          <p className="">{error}</p>
        </div>
      </div>
    );
  }

  if (!firebaseServices) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-muted-foreground">
        Lade Firebase...
      </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
