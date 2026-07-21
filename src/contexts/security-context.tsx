'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useUser } from './user-provider';
import { deviceSecurityService } from '@/lib/services/device-security-service';

interface SecurityContextType {
  isTerminalLocked: boolean;
  setIsTerminalLocked: (val: boolean) => void;
  isRestricted: boolean;
  setIsRestricted: (val: boolean) => void;
  isMfaVerified: boolean;
  setIsMfaVerified: (val: boolean) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

/**
 * INSTITUTIONAL SECURITY ORCHESTRATOR
 * Version: 5.0.0 (Lock-on-Leave Refinement)
 * 
 * Rules:
 * 1. LOCK-ON-LEAVE: The terminal instantly blurs and enters the secure gate when focus is lost.
 * 2. PERFORMANCE: State transitions are lightweight to prevent keypad lag.
 */
export function SecurityProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useUser();
  const [isTerminalLocked, setIsTerminalLocked] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [isMfaVerified, setIsMfaVerified] = useState(false);
  
  const hasInitialLocked = useRef(false);

  // 🛡️ LOCK-ON-LEAVE SENTINEL
  useEffect(() => {
    const handleVisibility = () => {
      // Instantly trigger lock if document is hidden and any lock method is active
      if (document.hidden && !!(profile?.pin_enabled || profile?.face_id_enabled)) {
        setIsTerminalLocked(true);
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    return () => window.removeEventListener('visibilitychange', handleVisibility);
  }, [profile]);

  // 🛡️ INITIAL AUDIT HANDSHAKE
  useEffect(() => {
    if (authLoading || !user || !profile) return;

    const runAudit = async () => {
      // 1. Hardware Trust Registry Check
      if (profile.device_lock_enabled) {
        const isTrusted = await deviceSecurityService.checkDeviceTrust(user.id);
        setIsRestricted(!isTrusted);
      } else {
        setIsRestricted(false);
      }

      // 2. Cold-Start Session Lock
      if (!hasInitialLocked.current) {
        if (profile.pin_enabled || profile.face_id_enabled) {
          setIsTerminalLocked(true);
        }
        hasInitialLocked.current = true;
      }
    };

    runAudit();
  }, [user, profile, authLoading]);

  return (
    <SecurityContext.Provider value={{ 
      isTerminalLocked, setIsTerminalLocked, 
      isRestricted, setIsRestricted,
      isMfaVerified, setIsMfaVerified 
    }}>
      {children}
    </SecurityContext.Provider>
  );
}

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (context === undefined) throw new Error('useSecurity must be used within SecurityProvider');
  return context;
};
