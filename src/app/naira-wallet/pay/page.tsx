'use client';

/**
 * DEPRECATED: Pay route has been merged into main hub and specific utility nodes.
 * This file is now a redirect node to maintain system continuity.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PayRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace('/naira-wallet'); }, [router]);
    return null;
}
