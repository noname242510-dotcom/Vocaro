'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';
import { enableIndexedDbPersistence } from "firebase/firestore";
import type { getSdks } from '@/firebase';

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

      try {
        await enableIndexedDbPersistence(services.firestore)
      } catch (err: any) {
        if (err.code == 'failed-precondition') {
          console.warn("Firestore-Persistence konnte nicht aktiviert werden, da mehrere Tabs geöffnet sind.");
        } else if (err.code == 'unimplemented') {
          console.warn("Firestore-Persistence wird in diesem Browser nicht unterstützt.");
        } else {
          console.error("Firestore-Persistence fehlgeschlagen", err);
        }
      }

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
