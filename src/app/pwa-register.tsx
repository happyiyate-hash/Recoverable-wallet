'use client';

import { useEffect } from 'react';

/**
 * PWA SERVICE WORKER REGISTRATION
 * Standard registration script to enable PWA installability.
 * Version: 1.0.1 (Directive Integrity Fix)
 */
export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('PWA Service Worker registered');
          })
          .catch((err) => {
            console.warn('PWA Service Worker registration failed:', err);
          });
      });
    }
  }, []);

  return null;
}
