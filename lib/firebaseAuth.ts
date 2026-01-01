// Firebase Authentication configuration
// Using dynamic imports to avoid loading Firebase client SDK on server

// Note: Firebase configuration values (authDomain, projectId, etc.) are meant to be public
// and can be safely committed to the repository. Only the API key needs to be in env vars.
// See: https://firebase.google.com/docs/projects/learn-more#config-files-objects

import type { Auth } from 'firebase/auth';

let auth: Auth | null = null;

async function initializeFirebaseAuth() {
  if (typeof window === 'undefined') {
    // Don't initialize on server
    return;
  }

  if (auth) {
    return; // Already initialized
  }

  // Use NEXT_PUBLIC_ prefix for client-side environment variables
  const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (!firebaseApiKey) {
    console.warn('Missing Firebase API key. Set NEXT_PUBLIC_FIREBASE_API_KEY or FIREBASE_API_KEY in your environment.');
    return;
  }

  // Firebase config values are public and safe to commit (they identify your Firebase project)
  const firebaseConfig = {
    apiKey: String(firebaseApiKey),
    authDomain: "wf-transportes.firebaseapp.com",
    projectId: "wf-transportes",
    storageBucket: "wf-transportes.firebasestorage.app",
    messagingSenderId: "1007058711716",
    appId: "1:1007058711716:web:27ee91b7a0c6328ed6a231",
    measurementId: "G-9P9G5SXZ82"
  };

  try {
    // Dynamic imports to avoid loading on server
    const { initializeApp, getApps } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    
    // Initialize Firebase if not already initialized
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    
    // Initialize Firebase Auth
    auth = getAuth(app);
  } catch (error) {
    console.error('Error initializing Firebase Auth:', error);
  }
}

// Initialize on client side
if (typeof window !== 'undefined') {
  void initializeFirebaseAuth();
}

export { auth, initializeFirebaseAuth };

