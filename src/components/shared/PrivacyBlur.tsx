
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck } from 'lucide-react';

/**
 * INSTITUTIONAL PRIVACY OVERLAY
 * Version: 1.0.0
 * 
 * Automatically blurs the terminal when focus is lost to prevent
 * over-the-shoulder discovery of private balances.
 */
export default function PrivacyBlur() {
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    const handleVisibility = () => {
      setIsBlurred(document.hidden);
    };

    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return (
    <AnimatePresence>
      {isBlurred && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-[40px] flex flex-col items-center justify-center gap-4"
        >
          <div className="w-16 h-16 rounded-[1.5rem] bg-black border border-white/10 flex items-center justify-center text-primary shadow-2xl">
            <Lock className="w-8 h-8" />
          </div>
          <div className="flex items-center gap-2 opacity-40">
            <ShieldCheck className="w-3 h-3 text-white" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Registry Shielded</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
