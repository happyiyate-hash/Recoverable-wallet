'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Delete, 
  ScanFace, 
  CheckCircle2,
  ChevronLeft as ChevronLeftIcon
} from 'lucide-react';
import { useUser } from '@/contexts/user-provider';
import { useSecurity } from '@/contexts/security-context';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import FaceScannerCard from './face-scanner-card';

/**
 * INSTITUTIONAL SECURITY SENTINEL (V12.0 - REFERENCE SYNC)
 * Version: 62.0.0 (High-Fidelity Structural Alignment)
 * 
 * Rules:
 * 1. STRUCTURAL SYNC: Mirrors the provided reference image layout perfectly.
 * 2. MACHINED KEYPAD: Digits sit inside wide pill-shaped capsules for tactile feedback.
 * 3. ZERO-LAG: Interaction is local-first; verification is strictly asynchronous.
 */
export default function PinLockOverlay() {
  const { profile, user, loading, signOut } = useUser();
  const { isTerminalLocked, setIsTerminalLocked } = useSecurity();
  
  const [pinValue, setPinValue] = useState('');
  const [isError, setIsError] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [mode, setMode] = useState<'pin' | 'face'>('pin');

  const verifyLock = useRef(false);
  const displayName = profile?.name || 'Wisdom';

  // 🛡️ RE-INITIALIZATION SENTINEL
  useEffect(() => {
    if (isTerminalLocked) {
      setPinValue('');
      setIsError(false);
      setIsVerifying(false);
      verifyLock.current = false;
    }
  }, [isTerminalLocked]);

  const handleUnlockSuccess = useCallback(() => {
    setIsUnlocked(true);
    setTimeout(() => {
      setIsTerminalLocked(false);
      setPinValue('');
      setIsUnlocked(false);
      setIsVerifying(false);
      setMode('pin');
    }, 600);
  }, [setIsTerminalLocked]);

  const handlePinInput = (digit: string) => {
    if (pinValue.length >= 4 || isUnlocked || isVerifying) return;
    
    // 1. UPDATE UI INSTANTLY
    const nextValue = pinValue + digit;
    setPinValue(nextValue);
    setIsError(false);

    // 2. TRIGGER ASYNC HANDSHAKE AT 4 DIGITS
    if (nextValue.length === 4) {
      performHandshake(nextValue);
    }
  };

  const performHandshake = async (code: string) => {
    if (verifyLock.current) return;
    verifyLock.current = true;
    setIsVerifying(true);

    try {
      const inputHash = btoa(code);
      const savedHash = profile?.pin_hash;

      // Small delay for tactile weight
      await new Promise(r => setTimeout(r, 150));

      if (inputHash === savedHash) {
        handleUnlockSuccess();
      } else {
        throw new Error("MISMATCH");
      }
    } catch (e) {
      setIsError(true);
      // Fast, aggressive shake
      setTimeout(() => {
        setPinValue('');
        setIsError(false);
        setIsVerifying(false);
        verifyLock.current = false;
      }, 400);
    }
  };

  const handleDelete = () => {
    if (isVerifying || isUnlocked) return;
    setPinValue(prev => prev.slice(0, -1));
    setIsError(false);
  };

  if (!isTerminalLocked || loading || !user) return null;

  return (
    <div className="fixed inset-0 z-[600] flex flex-col items-center bg-[#050505] text-white overflow-hidden pointer-events-auto">
      
      {/* 👤 IDENTITY CLUSTER (Refined Spacing) */}
      <div className="flex flex-col items-center mt-12 space-y-4 shrink-0">
        <div className="relative">
          <Avatar className="w-20 h-20 rounded-full border-2 border-white/10 shadow-2xl relative z-10 bg-black">
            <AvatarImage src={profile?.photo_url} className="rounded-full object-cover" />
            <AvatarFallback className="bg-white/5 text-white/40 text-xl font-black">{displayName[0]}</AvatarFallback>
          </Avatar>
        </div>
        <div className="text-center space-y-1">
          <p className="text-[10px] font-medium text-white/30 uppercase tracking-[0.3em]">Authorized Identity</p>
          <h2 className="text-xl font-black text-white tracking-tight uppercase">{displayName}</h2>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-end w-full max-w-md px-8 pb-12 gap-12">
        
        <div className="text-center space-y-6 w-full flex flex-col items-center">
          <p className="text-[14px] font-semibold text-white/40 tracking-tight uppercase">Enter Security PIN</p>

          {/* 🔳 NODE INPUT MATRIX (Premium Proportions) */}
          <div className="flex justify-center gap-4">
            {[0, 1, 2, 3].map((i) => (
              <motion.div 
                key={i}
                animate={isError ? { x: [-12, 12, -12, 12, 0] } : {}}
                className={cn(
                  "w-16 h-12 rounded-[1.5rem] border flex items-center justify-center transition-all duration-300",
                  isError ? "border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]" :
                  pinValue.length > i 
                    ? "border-primary/40 bg-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.05)]" 
                    : "border-white/5 bg-white/[0.02]"
                )}
              >
                <AnimatePresence>
                  {pinValue.length > i && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-4 h-4 rounded-full bg-white shadow-lg"
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 🕹️ MACHINED KEYPAD HUB (Institutional Spacing) */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-6 w-full px-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <motion.button 
              key={n} 
              whileTap={{ scale: 0.96, backgroundColor: "rgba(255,255,255,0.06)" }}
              onClick={() => handlePinInput(n.toString())} 
              className="h-14 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center text-2xl font-black text-white transition-all shadow-xl active:border-primary/30"
            >
              {n}
            </motion.button>
          ))}
          
          <button 
            onClick={() => profile?.face_id_enabled && setMode('face')}
            className={cn(
                "h-14 rounded-[2rem] flex items-center justify-center transition-all active:scale-96 border shadow-xl bg-white/[0.02] border-white/5 text-white hover:bg-white/[0.05]",
                !profile?.face_id_enabled && "opacity-20 grayscale"
            )}
            disabled={!profile?.face_id_enabled}
          >
            <ScanFace className="w-6 h-6" strokeWidth={2.5} />
          </button>

          <motion.button 
            whileTap={{ scale: 0.96, backgroundColor: "rgba(255,255,255,0.06)" }}
            onClick={() => handlePinInput("0")} 
            className="h-14 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center text-2xl font-black text-white transition-all shadow-xl active:border-primary/30"
          >
            0
          </motion.button>

          <motion.button 
            whileTap={{ scale: 0.96 }}
            onClick={handleDelete}
            className="h-14 rounded-[2rem] flex items-center justify-center bg-white/[0.02] border border-white/5 text-white transition-all hover:bg-white/[0.05]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.00004 15.37L12.63 12L9.00004 8.62998" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 12H12.63" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
        </div>
      </main>

      {/* 🏁 BOTTOM EXIT NODE */}
      <footer className="py-8 text-center shrink-0 w-full bg-gradient-to-t from-black/40 to-transparent">
        <p className="text-[12px] font-medium text-white/20 tracking-tight">
            Not {displayName}? <button onClick={signOut} className="text-primary font-black underline underline-offset-4 ml-2 uppercase text-[10px] tracking-[0.2em]">Sign Out</button>
        </p>
      </footer>

      {/* SUCCESS OVERLAY (REDUCED LATENCY) */}
      <AnimatePresence>
        {isUnlocked && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#050505] z-[800] flex flex-col items-center justify-center gap-6"
          >
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 2 }} className="absolute inset-0 z-0 bg-gradient-to-b from-primary/20 to-transparent" />
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 20 }} className="relative z-10 w-24 h-24 bg-primary rounded-full flex items-center justify-center text-black shadow-[0_0_100px_rgba(var(--primary),0.6)]">
              <CheckCircle2 className="w-12 h-12" />
            </motion.div>
            <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.5em] text-primary animate-pulse">Node Authorized</span>
          </motion.div>
        )}
      </AnimatePresence>

      <FaceScannerCard 
        isVisible={mode === 'face' && !isUnlocked}
        onSuccess={handleUnlockSuccess}
        onClose={() => setMode('pin')}
        savedEmbedding={profile?.face_id_embedding ? JSON.parse(profile.face_id_embedding) : null}
      />
    </div>
  );
}
