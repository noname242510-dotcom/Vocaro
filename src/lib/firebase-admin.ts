
import admin from 'firebase-admin';

// Dies verhindert eine Re-Initialisierung im Hot-Reload-Szenario von Next.js
if (!admin.apps.length) {
  admin.initializeApp();