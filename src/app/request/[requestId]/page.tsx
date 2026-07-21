
'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWallet } from '@/contexts/wallet-provider';

/**
 * REDIRECTOR: standalone Review Page is now an Overlay Moment.
 * Deep links land on the dashboard background with the Review Overlay active.
 */
export default function RequestFulfillmentRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const { setActiveFulfillmentId } = useWallet();

  useEffect(() => {
    if (params.requestId) {
      setActiveFulfillmentId(params.requestId as string);
      router.replace('/');
    }
  }, [params.requestId, router, setActiveFulfillmentId]);

  return null;
}
