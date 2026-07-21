
'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/contexts/user-provider';
import { useWallet } from '@/contexts/wallet-provider';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

/**
 * GLOBAL LOADING BARRIER
 * Version: 17.0.0 (Fail-Fast Logic Node)
 */
export default function GlobalLoadingBarrier() {
  const { loading: authLoading, profile } = useUser();
  const { isInitialized, isWalletLoading, wallets } = useWallet();
  const [isVisible, setIsVisible] = useState(true);
  const hasHydratedRef = useRef(false);
  const pathname = usePathname();

  const isAuthRoute = pathname.startsWith('/auth');
  
  useEffect(() => {
    // 1. BOOTSTRAP: Barrier remains locked while auth node is first probing
    if (authLoading) return;

    // 2. AUTH ROUTE BYPASS
    if (isAuthRoute) {
      setIsVisible(false);
      hasHydratedRef.current = true;
      return;
    }

    // 3. FAIL-FAST HYDRATION: Drop barrier once we know the state
    // We drop if we have data OR if the wallet hydration check finished (even if wallets are null)
    if (profile !== undefined && isInitialized && !isWalletLoading) {
      if (!hasHydratedRef.current) {
        hasHydratedRef.current = true;
        const timer = setTimeout(() => setIsVisible(false), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [authLoading, profile, isInitialized, isWalletLoading, isAuthRoute]);

  // SAFETY SENTINEL: Hard drop to prevent infinite hang
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black text-white transition-opacity duration-500">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15)_0%,transparent_70%)]" />
      </div>

      <div className="relative mb-12 flex items-center justify-center scale-110">
        <div className="w-28 h-28 rounded-full border-t-2 border-primary/40 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-900 border border-white/5 overflow-hidden shadow-[0_0_40px_rgba(139,92,246,0.2)] animate-pulse relative">
            <Image 
              src="/icons/icon-512.png"
              alt="Node Quick Logo"
              width={64}
              height={64}
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-6 text-center px-10 relative z-10">
        <div className="flex flex-col items-center">
          <h2 className="text-3xl font-black uppercase tracking-[0.4em] bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 drop-shadow-2xl">
            Node Quick
          </h2>
          <div className="h-px w-12 bg-primary/40 mt-2" />
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="h-1 w-32 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-[loading_2s_ease-in-out_infinite]" style={{ width: '40%' }} />
          </div>
          <p className="text-[10px] text-primary font-black uppercase tracking-[0.25em] animate-pulse">
            Registry Handshake Active
          </p>
        </div>
      </div>

      <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-2 opacity-30">
        <div className="h-px w-6 bg-white/20 mb-1" />
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white">
          wevina v2
        </p>
      </div>

      <style jsx global>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}
