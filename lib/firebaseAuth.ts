// Firebase Authentication configuration
// Using dynamic imports to avoid loading Firebase client SDK on server

import type { Auth, GoogleAuthProvider } from 'firebase/auth';

let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

async function initializeFirebaseAuth() {
  if (typeof window === 'undefined') {
    // Don't initialize on server
    return;
  }

  if (auth) {
    return; // Already initialized
  }

  const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (!firebaseApiKey) {
    console.warn('Missing Firebase API key. Set NEXT_PUBLIC_FIREBASE_API_KEY or FIREBASE_API_KEY in your environment.');
    return;
  }

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
    const { getAuth, GoogleAuthProvider } = await import('firebase/auth');
    
    // Initialize Firebase if not already initialized
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    
    // Initialize Firebase Auth
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error('Error initializing Firebase Auth:', error);
  }
}

// Initialize on client side
if (typeof window !== 'undefined') {
  void initializeFirebaseAuth();
}

export { auth, googleProvider, initializeFirebaseAuth };

