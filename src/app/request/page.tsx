
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/wallet-provider';

/**
 * REDIRECTOR: Standalone Request Page is now an Overlay Moment.
 * Redirects to the dashboard and triggers the overlay state.
 */
export default function RequestRedirectPage() {
  const router = useRouter();
  const { setIsRequestOverlayOpen } = useWallet();

  useEffect(() => {
    setIsRequestOverlayOpen(true);
    router.replace('/');
  }, [router, setIsRequestOverlayOpen]);

  return null;
}
