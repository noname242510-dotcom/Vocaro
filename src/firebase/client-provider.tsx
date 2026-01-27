'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { setPersistence, browserLocalPersistence } from 'firebase/auth'; // <--- NEU HINZUGEFÜGT
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
      
      // --- DIESEN BLOCK HINZUFÜGEN ---
      // Das sorgt dafür, dass die Anmeldung in der PWA gespeichert bleibt
      try {
        await setPersistence(services.auth, browserLocalPersistence);
        console.log("Firebase Persistence auf LOCAL gesetzt.");
      } catch (error) {
        console.error("Fehler beim Setzen der Persistence:", error);
      }
      // -------------------------------

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