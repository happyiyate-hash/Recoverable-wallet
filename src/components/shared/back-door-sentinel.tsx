
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DoorOpen, ArrowRight, X, ShieldCheck, Zap, Pin, Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

/**
 * INSTITUTIONAL BACK-DOOR SENTINEL V2
 * Version: 2.2.0 (Positioning Offset Standard)
 * 
 * Rules:
 * 1. FLOATING NODE: Moved to bottom-24 to avoid list item icon confusion.
 * 2. DROPDOWN HANDSHAKE: Three actions: Save (Pin), Navigate Back, or Close.
 * 3. PIN PROTOCOL: Saving a node disables the 60s countdown timer.
 */

const INTERACTION_NODES = [
  '/send',
  '/swap',
  '/buy',
  '/tokens/add',
  '/naira-wallet/send',
  '/naira-wallet/receive',
  '/escrow/create',
  '/ai-copilot'
];

export function BackDoorSentinel() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isVisible, setIsVisible] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [lastPath, setLastPath] = useState<string | null>(null);
  const [lastPathName, setLastPathName] = useState('');
  
  const prevPathRef = useRef<string>(pathname);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownStartRef = useRef<number>(0);

  const getPageName = (path: string) => {
    if (path.includes('/send')) return 'Send Funds';
    if (path.includes('/swap')) return 'Asset Swap';
    if (path.includes('/buy')) return 'Buy Crypto';
    if (path.includes('/tokens/add')) return 'Add Token';
    if (path.includes('/naira-wallet')) return 'Naira Banking';
    if (path.includes('/escrow')) return 'Escrow Registry';
    if (path.includes('/ai-copilot')) return 'Sentinel AI';
    return 'Interaction';
  };

  useEffect(() => {
    const isInteracting = INTERACTION_NODES.some(node => prevPathRef.current.startsWith(node));
    const hasNavigatedAway = pathname !== prevPathRef.current;

    if (isInteracting && hasNavigatedAway) {
      // Initialize the 60s "Back Door" Node
      setLastPath(prevPathRef.current);
      setLastPathName(getPageName(prevPathRef.current));
      setIsVisible(true);
      setIsPinned(false);
      setIsMenuOpen(false);
      countdownStartRef.current = Date.now();

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        setIsMenuOpen(false);
      }, 60000);
    }

    prevPathRef.current = pathname;
    
    // If we return to the last path manually, hide the sentinel
    if (lastPath === pathname) {
      setIsVisible(false);
      setIsMenuOpen(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [pathname, lastPath]);

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPinned(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsMenuOpen(false);
  };

  const handleReturn = () => {
    if (lastPath && lastPath !== pathname) {
      router.push(lastPath);
      setIsModalOpen(false);
      setIsVisible(false);
      setIsMenuOpen(false);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setIsMenuOpen(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && !pathname.startsWith('/auth') && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="fixed right-6 bottom-24 z-[400] md:bottom-10"
          >
            <div className="relative">
              {/* DROPDOWN MENU HANDSHAKE */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full right-0 mb-4 w-48 bg-[#0a0a0c] border border-white/10 rounded-2xl p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[410] overflow-hidden"
                  >
                    <button 
                      onClick={() => { setIsModalOpen(true); setIsMenuOpen(false); }}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group"
                    >
                      <span className="text-[10px] font-black uppercase text-white tracking-widest">Navigate Back</span>
                      <ArrowRight className="w-3 h-3 text-primary group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button 
                      onClick={handlePin}
                      disabled={isPinned}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group",
                        isPinned && "opacity-40 grayscale"
                      )}
                    >
                      <span className="text-[10px] font-black uppercase text-white tracking-widest">{isPinned ? 'Session Saved' : 'Save Page'}</span>
                      <Pin className={cn("w-3 h-3", isPinned ? "text-green-500" : "text-white/40")} />
                    </button>

                    <div className="h-px bg-white/5 my-1" />

                    <button 
                      onClick={handleClose}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-500/10 transition-all group"
                    >
                      <span className="text-[10px] font-black uppercase text-red-500/60 group-hover:text-red-500 tracking-widest">Close Node</span>
                      <X className="w-3 h-3 text-red-500/40 group-hover:text-red-500" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* FLOATING TRIGGER ICON */}
              <button
                onClick={toggleMenu}
                className={cn(
                  "group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0a0a0c]/90 backdrop-blur-xl border-2 transition-all active:scale-95 shadow-[0_10px_40px_rgba(0,0,0,0.6)]",
                  isPinned ? "border-green-500/40" : "border-primary/60",
                  isMenuOpen && "scale-90"
                )}
              >
                <div className={cn(
                  "w-full h-full rounded-2xl flex items-center justify-center transition-all",
                  isPinned ? "text-green-500 bg-green-500/5" : "text-primary bg-primary/5"
                )}>
                  <DoorOpen className="w-6 h-6" />
                </div>
                
                {/* 📏 NANO-SLIM COUNTDOWN (Only if not pinned) */}
                {!isPinned && (
                  <div className="absolute bottom-0 left-0 h-0.5 bg-primary/20 w-full overflow-hidden rounded-b-2xl">
                    <motion.div 
                        initial={{ x: "-100%" }}
                        animate={{ x: "0%" }}
                        transition={{ duration: 60, ease: "linear" }}
                        className="h-full bg-primary"
                    />
                  </div>
                )}

                {/* PIN INDICATOR */}
                {isPinned && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0c] shadow-lg animate-pulse" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px] overflow-hidden shadow-2xl">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-flow" />
          
          <DialogHeader className="items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
              <DoorOpen className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Restore Session?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed uppercase tracking-widest font-bold">
              You left the <span className="text-white">{lastPathName}</span> terminal. Do you wish to return and continue the handshake?
            </DialogDescription>
          </DialogHeader>

          <div className="mt-8 flex flex-col gap-3">
            <Button 
              className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-black font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/20 gap-3"
              onClick={handleReturn}
            >
              <Zap className="w-4 h-4 fill-current" />
              Resume Handshake
            </Button>
            <Button 
              variant="ghost" 
              className="w-full h-12 rounded-2xl font-bold text-white/40 uppercase text-[10px]"
              onClick={() => { setIsModalOpen(false); setIsVisible(false); setIsMenuOpen(false); }}
            >
              Dismiss Session
            </Button>
          </div>

          <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-center gap-2 opacity-20">
            <ShieldCheck className="w-3 h-3" />
            <span className="text-[8px] font-black uppercase tracking-widest">Session Sentinel v2.0</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

