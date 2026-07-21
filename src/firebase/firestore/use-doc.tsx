'use client';

import { useEffect, useState } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentSnapshot,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError, SecurityRuleContext } from '../errors';

export function useDoc<T = DocumentData>(ref: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const [snapshot, setSnapshot] = useState<DocumentSnapshot<T> | null>(null);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      ref,
      (s) => {
        setSnapshot(s);
        setData(s.exists() ? ({ ...s.data(), id: s.id } as T) : null);
        setLoading(false);
      },
      async (err) => {
        setError(err);
        setLoading(false);

        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: ref.path,
            operation: 'get',
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        }
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, loading, error, snapshot };
}
