'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

export async function initializeFirebase() {
  if (getApps().length) {
    return await getSdks(getApp());
  }

  const firebaseApp = initializeApp(firebaseConfig);
  return await getSdks(firebaseApp);
}

export async function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });

  return {
    firebaseApp,
    auth,
    firestore
  };
}
