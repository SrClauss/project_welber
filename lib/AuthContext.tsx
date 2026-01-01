'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { auth, initializeFirebaseAuth } from './firebaseAuth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    async function setupAuth() {
      // Wait for Firebase Auth to initialize
      await initializeFirebaseAuth();

      // Check if component is still mounted and auth is available
      if (!mounted) return;

      if (!auth) {
        setLoading(false);
        return;
      }

      // Dynamic import to avoid loading firebase/auth on server
      try {
        const { onAuthStateChanged } = await import('firebase/auth');
        
        if (!mounted || !auth) {
          setLoading(false);
          return;
        }

        unsubscribe = onAuthStateChanged(auth, (user) => {
          if (mounted) {
            setUser(user);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error loading Firebase auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void setupAuth();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
