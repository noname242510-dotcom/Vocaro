'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore'

let cachedSdks: { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } | null = null;

export async function initializeFirebase() {
  if (cachedSdks) {
    console.log("initializeFirebase: Using cached Firebase services.");
    return cachedSdks;
  }

  let firebaseApp: FirebaseApp;
  if (getApps().length) {
    firebaseApp = getApp();
    console.log("initializeFirebase: Using existing Firebase App instance.");
  } else {
    firebaseApp = initializeApp(firebaseConfig);
    console.log("initializeFirebase: Initialized NEW Firebase App instance.");
  }

  cachedSdks = await getSdks(firebaseApp);
  return cachedSdks;
}

export async function getSdks(firebaseApp: FirebaseApp) {
  if (cachedSdks && cachedSdks.firebaseApp === firebaseApp) {
    return cachedSdks;
  }

  console.log("getSdks: Initializing Firebase SDKs...");

  // 1. Initialize Auth carefully
  let auth: Auth;
  try {
    // We try to INITIALIZE Auth first to set the persistence.
    // If it's already initialized, this will throw, and we'll fall back to getAuth().
    console.log("getSdks: Initializing Auth with browserLocalPersistence...");
    auth = initializeAuth(firebaseApp, {
      persistence: browserLocalPersistence
    });
  } catch (e) {
    console.warn("getSdks: initializeAuth failed (likely already initialized), falling back to getAuth(). Error:", e);
    auth = getAuth(firebaseApp);
  }

  // 2. Initialize Firestore
  let firestore;
  try {
    // Firestore's getFirestore doesn't create the same conflicts as initializeAuth
    firestore = getFirestore(firebaseApp);
    console.log("getSdks: Using existing Firestore instance.");
  } catch (e) {
    console.log("getSdks: Initializing new Firestore instance...");
    firestore = initializeFirestore(firebaseApp, {
      // Explicitly disabling persistence for now to ensure fastest connection
    });
  }

  const sdks = {
    firebaseApp,
    auth,
    firestore
  };

  cachedSdks = sdks as any;
  console.log("getSdks: SDKs initialization complete.");
  return sdks as any;
}
