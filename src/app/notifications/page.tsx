
'use client';

/**
 * REDIRECTOR: Standalone Notifications Page is now a Top-Sliding Overlay.
 * Redirecting to prevent dead links while maintaining system architecture.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/wallet-provider';

export default function NotificationsRedirectPage() {
    const router = useRouter();
    const { setIsNotificationsOpen } = useWallet();

    useEffect(() => {
        setIsNotificationsOpen(true);
        router.replace('/');
    }, [router, setIsNotificationsOpen]);

    return null;
}
