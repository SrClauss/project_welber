// Firestore client using Firebase client SDK
// This replaces firebase-admin for database operations

import type { Firestore } from 'firebase/firestore';

let db: Firestore | null = null;

async function initializeFirestore() {
  if (db) {
    return db; // Already initialized
  }

  // Use NEXT_PUBLIC_ prefix for client-side environment variables
  // Fallback to FIREBASE_API_KEY for backwards compatibility
  const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (!firebaseApiKey) {
    throw new Error('Missing Firebase API key. Set NEXT_PUBLIC_FIREBASE_API_KEY or FIREBASE_API_KEY in your environment.');
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
    // Dynamic imports to avoid loading on server during build
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');
    
    // Initialize Firebase if not already initialized
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    
    // Initialize Firestore
    db = getFirestore(app);
    return db;
  } catch (error) {
    console.error('Error initializing Firestore:', error);
    throw error;
  }
}

export async function getFirestoreInstance(): Promise<Firestore> {
  if (!db) {
    await initializeFirestore();
  }
  if (!db) {
    throw new Error('Failed to initialize Firestore');
  }
  return db;
}
