'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useCollection, WithId } from '@/firebase/firestore/use-collection';
import { collection, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import type { UserSettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export type UserSettingsData = WithId<UserSettings>;

const defaultSettings: Omit<UserSettings, 'id'> = {
    font: 'font-body',
    enableConfetti: true,
    hapticFeedback: true,
    ttsEnabled: false,
    ttsAutoplay: true,
    vocabQueryDirection: false, // false: term -> definition
    vocabShowHints: true,
    vocabOverviewDirection: 'term',
    verbQueryDirection: false, // false: foreign -> german
    verbShowHints: true,
    darkMode: false,
};

interface SettingsContextType {
  settings: UserSettingsData | null;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<Omit<UserSettings, 'id'>>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { firestore, user } = useFirebase();
  const [settings, setSettings] = useState<UserSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const settingsCollectionRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'settings');
  }, [firestore, user]);

  const { data: settingsData, isLoading: isSettingsLoading } = useCollection<UserSettings>(settingsCollectionRef);

  useEffect(() => {
    if (!isSettingsLoading) {
        if (settingsData && settingsData.length > 0) {
            const fetchedSettings = settingsData[0];
            setSettings({ ...defaultSettings, ...fetchedSettings, id: fetchedSettings.id });
        } else if (user && firestore && settingsCollectionRef && settingsData?.length === 0) {
            const createDefaultSettings = async () => {
                const newSettings = { ...defaultSettings, userId: user.uid, createdAt: serverTimestamp() };
                try {
                    const docRef = await addDoc(settingsCollectionRef, newSettings);
                    setSettings({ ...newSettings, id: docRef.id } as UserSettingsData);
                } catch (error) {
                    console.error("Could not create default settings:", error);
                }
            };
            createDefaultSettings();
        }
        setIsLoading(false);
    }
  }, [settingsData, isSettingsLoading, user, firestore, settingsCollectionRef]);
  
  // Apply side-effects when settings change
  useEffect(() => {
    if (settings) {
      // Font
      document.body.classList.remove('font-body', 'font-creative', 'font-code');
      document.body.classList.add(settings.font);
      // Dark Mode
      if (settings.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [settings]);

  const updateSettings = useCallback(async (newSettings: Partial<Omit<UserSettings, 'id'>>) => {
    if (!firestore || !user || !settings?.id) return;
    
    // Optimistic update
    setSettings(prev => prev ? { ...prev, ...newSettings } as UserSettingsData : null);

    const settingsDocRef = doc(firestore, 'users', user.uid, 'settings', settings.id);
    try {
        await updateDoc(settingsDocRef, newSettings);
    } catch (error) {
        console.error("Failed to update settings:", error);
        // TODO: Revert optimistic update on error
    }
  }, [firestore, user, settings]);
  
  const value = useMemo(() => ({ settings, isLoading, updateSettings }), [settings, isLoading, updateSettings]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

    