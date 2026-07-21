
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { initializeFirebase } from './index';

interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  isInitialized: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  auth: null,
  db: null,
  isInitialized: false,
});

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FirebaseContextType>({
    app: null,
    auth: null,
    db: null,
    isInitialized: false,
  });

  useEffect(() => {
    const { app, auth, db } = initializeFirebase();
    setState({ app, auth, db, isInitialized: true });
  }, []);

  return (
    <FirebaseContext.Provider value={state}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => useContext(FirebaseContext);
export const useAuth = () => useContext(FirebaseContext).auth;
export const useFirestore = () => useContext(FirebaseContext).db;
