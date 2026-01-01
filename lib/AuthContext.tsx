'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { auth } from './firebaseAuth';

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

    if (!auth) {
      setLoading(false);
      return;
    }

    // Dynamic import to avoid loading firebase/auth on server
    import('firebase/auth')
      .then(({ onAuthStateChanged }) => {
        if (!auth) {
          setLoading(false);
          return;
        }
        unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user);
          setLoading(false);
        });
      })
      .catch((error) => {
        console.error('Error loading Firebase auth:', error);
        setLoading(false);
      });

    return () => {
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
