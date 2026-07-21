'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import WalletTab from '@/components/wallet-tab';
import DesktopWalletTab from '@/components/wallet/desktop-wallet-tab';
import { useWallet } from '@/contexts/wallet-provider';
import { useUser } from '@/contexts/user-provider';
import { useSecurity } from '@/contexts/security-context';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import ApiKeyRequestSheet from '@/components/wallet/api-key-request-sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * ROOT HANDSHAKE NODE
 * Version: 9.0.0 (Unified Responsive Entry)
 */
function HomeContent() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useUser();
  const { isTerminalLocked } = useSecurity();
  const { 
    isRequestOverlayOpen,
    activeFulfillmentId,
    allAssets,
    infuraApiKey,
    wallets,
    isInitialized,
    isWalletLoading,
    runCloudDiagnostic
  } = useWallet();

  const [mounted, setMounted] = useState(false);
  const syncTriggeredRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ☁️ CLOUD SYNC SENTINEL
  useEffect(() => {
    if (isInitialized && !isWalletLoading && wallets && user && !syncTriggeredRef.current && !isTerminalLocked) {
      const sessionKey = `ss-sync-lock-${user.id}`;
      const alreadySyncedInSession = typeof window !== 'undefined' && sessionStorage.getItem(sessionKey);
      
      if (!alreadySyncedInSession) {
        syncTriggeredRef.current = true;
        setTimeout(() => {
          runCloudDiagnostic();
          sessionStorage.setItem(sessionKey, 'true');
        }, 3000);
      }
    }
  }, [isInitialized, isWalletLoading, wallets, user, isTerminalLocked, runCloudDiagnostic]);

  // BOOTSTRAP GATE
  if (authLoading || !mounted || (user && profile === undefined)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-black gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
          Synchronizing Identity...
        </p>
      </div>
    );
  }

  // WALLET INITIALIZATION GATE
  if (!isInitialized || isWalletLoading || !wallets || wallets.length === 0) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-black gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Hydrating Hardware Vault...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-transparent pb-32 relative min-h-screen">
      <main className={cn(
        "flex flex-col items-center transition-all duration-700 ease-out",
        (isRequestOverlayOpen || activeFulfillmentId || isTerminalLocked) && "blur-xl scale-95 opacity-50 pointer-events-none"
      )}>
        <div className="w-full mx-auto h-full">
           {/* RESPONSIVE VIEW SELECTION */}
           {isMobile ? (
             <WalletTab computedAssets={allAssets} />
           ) : (
             <DesktopWalletTab computedAssets={allAssets} />
           )}
        </div>
      </main>

    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}