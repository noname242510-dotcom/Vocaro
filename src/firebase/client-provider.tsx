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

  useEffect(() => {
    const init = async () => {
      const services = await initializeFirebase();

      try {
        await setPersistence(services.auth, browserLocalPersistence);
      } catch (error) {
        console.error("Fehler beim Setzen der Auth-Persistence:", error);
      }

      // Persistence is now handled automatically by Firebase v10+ if configured,
      // but we ensure it's initialized correctly here if needed.
      setFirebaseServices(services);
    };
    init();
  }, []);

  if (!firebaseServices) {
    return null;
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
