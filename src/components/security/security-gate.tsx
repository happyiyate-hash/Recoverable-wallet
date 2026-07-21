'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/contexts/user-provider';
import { useSecurity } from '@/contexts/security-context';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import PinLockOverlay from './pin-lock-overlay';
import DeviceUnlockOverlay from './device-unlock-overlay';
import { Loader2, ShieldAlert, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * INSTITUTIONAL SECURITY GATE
 * Version: 3.0.0 (Inline Verification Standard)
 * 
 * Rules:
 * 1. NO NAVIGATION HIJACK: Verification happens inline via modal.
 * 2. SEQUENTIAL CHECKPOINT: Audits session step-by-step.
 */
export function SecurityGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useUser();
  const { isRestricted } = useSecurity();
  const pathname = usePathname();
  const router = useRouter();
  
  const [mfaStatus, setMfaStatus] = useState<'checking' | 'verified' | 'required'>('checking');
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  // 🛡️ MFA SEQUENTIAL AUDIT
  useEffect(() => {
    async function checkMFA() {
      if (!user || !supabase) return;
      try {
        const { data: aal } = await supabase.auth.getAuthenticatorAssuranceLevel();
        if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
          setMfaStatus('required');
          if (pathname !== '/auth/mfa-verify') router.push('/auth/mfa-verify');
        } else {
          setMfaStatus('verified');
        }
      } catch (e) {
        setMfaStatus('verified'); 
      }
    }
    checkMFA();
  }, [user, pathname, router]);

  const isPublicPage = pathname.startsWith('/auth');

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-black">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (isPublicPage || !user) return <>{children}</>;

  if (profile === undefined) return null;

  // 1. MFA CHECK
  if (mfaStatus === 'required' && pathname !== '/auth/mfa-verify') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2. EMERGENCY LOCKDOWN
  if (profile?.security_locked && pathname !== '/security/lockdown' && !pathname.startsWith('/support')) {
    router.replace('/security/lockdown');
    return null;
  }

  // 3. ADMINISTRATIVE BLOCKADE
  if (profile?.is_blocked && pathname !== '/blocked' && !pathname.startsWith('/support')) {
    router.replace('/blocked');
    return null;
  }

  // 4. ONBOARDING GATE
  const hasLocalVault = typeof window !== 'undefined' && localStorage.getItem(`ss-mnemonic-${user.id}`);
  if ((!hasLocalVault || !profile?.onboarding_completed) && pathname !== '/wallet-session' && !pathname.startsWith('/support')) {
    router.replace('/wallet-session');
    return null;
  }

  return (
    <div className="flex flex-col flex-1 relative min-h-screen w-full">
      <AnimatePresence>
        {isRestricted && (
          <motion.div 
            initial={{ y: -100 }} animate={{ y: 0 }} exit={{ y: -100 }}
            className="fixed top-0 inset-x-0 z-[450] bg-red-500/90 backdrop-blur-xl p-4 border-b border-red-600 shadow-2xl"
          >
            <div className="max-w-lg mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
                <div>
                  <p className="text-[10px] font-black uppercase text-white tracking-widest leading-none">Unrecognized Hardware</p>
                  <p className="text-[8px] font-bold text-white/80 uppercase mt-1">Actions Restricted</p>
                </div>
              </div>
              <button 
                onClick={() => setIsVerifyModalOpen(true)}
                className="bg-white px-4 py-2 rounded-full text-red-600 text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
              >
                Verify Node
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={cn(
        "flex-1 transition-all duration-700 w-full relative",
        isRestricted && "opacity-50 grayscale-[0.5] scale-[0.99] pointer-events-none pt-20"
      )}>
        {children}
      </main>

      {/* INLINE VERIFICATION HANDSHAKE */}
      <DeviceUnlockOverlay 
        isOpen={isVerifyModalOpen} 
        onClose={() => setIsVerifyModalOpen(false)} 
      />

      {/* PIN OVERLAY HANDSHAKE */}
      <PinLockOverlay />
    </div>
  );
}
