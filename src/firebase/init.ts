'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export async function initializeFirebase() {
  console.log('initializeFirebase: Starting...');
  if (!getApps().length) {
    let firebaseApp;
    try {
      console.log('initializeFirebase: Attempting initializeApp()...');
      firebaseApp = initializeApp();
      console.log('initializeFirebase: initializeApp() successful.');
    } catch (e) {
      console.warn('initializeFirebase: initializeApp() failed, falling back to config.', e);
      firebaseApp = initializeApp(firebaseConfig);
      console.log('initializeFirebase: initializeApp(firebaseConfig) successful.');
    }

    return await getSdks(firebaseApp);
  }

  console.log('initializeFirebase: Already initialized, returning existing app.');
  return await getSdks(getApp());
}

export async function getSdks(firebaseApp: FirebaseApp) {
  console.log('getSdks: Initializing Auth...');
  const auth = getAuth(firebaseApp);
  console.log('getSdks: Initializing Firestore...');
  const firestore = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  console.log('getSdks: Done.');

  return {
    firebaseApp,
    auth,
    firestore
  };
}
