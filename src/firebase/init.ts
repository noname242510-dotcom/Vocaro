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
  console.log("getSdks: Initializing Auth...");
  const auth = getAuth(firebaseApp);
  console.log("getSdks: Initializing Firestore (no persistence)...");
  const firestore = initializeFirestore(firebaseApp, {});
  console.log("getSdks: SDKs initialized.");

  return {
    firebaseApp,
    auth,
    firestore
  };
}
