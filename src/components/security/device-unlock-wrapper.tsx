
'use client';

import { useState } from 'react';
import { useUser } from '@/contexts/user-provider';
import DeviceUnlockOverlay from './device-unlock-overlay';
import { ShieldAlert, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * INSTITUTIONAL RESTRICTED MODE WRAPPER
 * Version: 2.0.0 (Global Banner Protocol)
 * 
 * Replaces the aggressive full-screen lock with a professional sentinel banner.
 * Manages the transition from restricted state to authorized node.
 */
export default function DeviceUnlockOverlayWrapper() {
  const { isRestricted, profile } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isLockEnabled = (profile as any)?.device_lock_enabled;

  return (
    <>
      <AnimatePresence>
        {isLockEnabled && isRestricted && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[450] pointer-events-auto"
          >
            <div className="bg-red-500/90 backdrop-blur-3xl border-b border-red-600 shadow-2xl p-4">
              <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shadow-lg animate-pulse">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Unrecognized Hardware</p>
                    <p className="text-[9px] font-bold text-white/80 uppercase">Vault Actions restricted</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="px-5 py-2.5 rounded-full bg-white text-red-600 font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  Verify Node
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeviceUnlockOverlay 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
