'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * AI CHAT REDIRECTOR
 * Version: 2.0.0 (Node Deactivated)
 */
export default function AiChatPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home as AI nodes are offline
    router.replace('/');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-black">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#B088F5]/20 border border-[#B088F5]/40" />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#B088F5]/60">Redirecting Node...</p>
      </div>
    </div>
  );
}
