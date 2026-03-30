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
  const [status, setStatus] = useState<string>("Initialisiere...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      console.log("FirebaseClientProvider: Starting initialization...");
      setStatus("Firebase wird geladen...");
      
      const timeoutId = setTimeout(() => {
        if (!firebaseServices) {
          console.warn("FirebaseClientProvider: Initialization timed out.");
          setStatus("Initialisierung dauert lange... bitte warten.");
        }
      }, 5000);

      try {
        const services = await initializeFirebase();
        clearTimeout(timeoutId);
        console.log("FirebaseClientProvider: Services object received.");
        setStatus("Dienste bereit...");

        // Set services immediately
        setFirebaseServices(services);

        // Persistence can happen in the background without blocking the UI
        console.log("FirebaseClientProvider: Triggering auth persistence (background)...");
        setPersistence(services.auth, browserLocalPersistence)
          .then(() => console.log("FirebaseClientProvider: Auth persistence set."))
          .catch(err => console.error("FirebaseClientProvider: Auth persistence error:", err));

      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error("FirebaseClientProvider: Initialization failed", err);
        setError("Fehler beim Starten von Firebase: " + (err.message || String(err)));
      }
    };
    init();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="max-w-md p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Firebase Fehler</h1>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Neu laden
          </button>
        </div>
      </div>
    );
  }

  if (!firebaseServices) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p>{status}</p>
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
