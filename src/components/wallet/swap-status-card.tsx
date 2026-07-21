'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Repeat, Loader2 } from 'lucide-react';
import TokenLogoDynamic from '../shared/TokenLogoDynamic';
import { cn } from '@/lib/utils';

interface SwapStatusCardProps {
  isVisible: boolean;
  status: 'pending' | 'success' | 'error';
  fromToken: {
    symbol: string;
    iconUrl?: string | null;
    chainId: number;
    name?: string;
  };
  toToken: {
    symbol: string;
    iconUrl?: string | null;
    chainId: number;
    name?: string;
  };
  label?: string;
}

/**
 * INSTITUTIONAL SWAP STATUS SENTINEL
 * Version: 2.1.0 (Top-Down Sliding Protocol)
 * 
 * Rules:
 * 1. DEDICATED SWAP UI: Visualizes liquidity exchange instead of a projectile send.
 * 2. TOP SLIDE: Cinematic entry from the top of the terminal.
 * 3. HIGH-Z: Z-index 500 to command the screen.
 */
export default function SwapStatusCard({
  isVisible,
  status,
  fromToken,
  toToken,
  label
}: SwapStatusCardProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -150, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          className="fixed top-6 left-4 right-4 z-[500] max-w-lg mx-auto pointer-events-none"
        >
          <div className="bg-[#0a0a0c]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden relative">
            <div className={cn(
              "absolute -right-10 -top-10 w-32 h-32 blur-3xl transition-colors duration-1000",
              status === 'success' ? "bg-green-500/30" : status === 'error' ? "bg-red-500/30" : "bg-primary/20"
            )} />

            <div className="flex items-center justify-between relative z-10">
              {/* FROM TOKEN NODE */}
              <div className="flex flex-col items-center gap-2 min-w-[70px]">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl border-2 border-white/10 flex items-center justify-center overflow-hidden bg-black shadow-xl">
                    <TokenLogoDynamic 
                        logoUrl={fromToken.iconUrl} 
                        size={32} 
                        chainId={fromToken.chainId} 
                        symbol={fromToken.symbol} 
                        name={fromToken.name}
                    />
                  </div>
                </div>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest truncate w-16 text-center">
                  {fromToken.symbol}
                </span>
              </div>

              {/* SWAP HANDSHAKE (ROTATING) */}
              <div className="flex-1 flex flex-col items-center justify-center px-4">
                <div className="flex items-center gap-4">
                    <div className="w-px h-6 border-l border-dashed border-white/10" />
                    <motion.div
                        animate={status === 'pending' ? { rotate: 360 } : {}}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className={cn(
                            "w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center",
                            status === 'success' ? "text-green-500" : status === 'error' ? "text-red-500" : "text-primary"
                        )}
                    >
                        {status === 'pending' ? <Repeat className="w-4 h-4" /> : status === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </motion.div>
                    <div className="w-px h-6 border-l border-dashed border-white/10" />
                </div>
                <div className="mt-2 text-center">
                    <span className={cn(
                        "text-[8px] font-black uppercase tracking-[0.2em] px-2",
                        status === 'success' ? "text-green-500" : status === 'error' ? "text-red-500" : "text-primary"
                    )}>
                        {label || (status === 'pending' ? 'SWAPPING' : status === 'success' ? 'SETTLED' : 'FAILED')}
                    </span>
                </div>
              </div>

              {/* TO TOKEN NODE */}
              <div className="flex flex-col items-center gap-2 min-w-[70px]">
                <div className="relative">
                  <motion.div
                    animate={status === 'success' ? { 
                      scale: [1, 1.1, 1],
                      boxShadow: ["0 0 0px #22c55e", "0 0 30px #22c55e", "0 0 0px #22c55e"]
                    } : {}}
                    transition={{ duration: 1, repeat: status === 'success' ? Infinity : 0 }}
                    className={cn(
                      "w-12 h-12 rounded-2xl border-2 border-white/10 flex items-center justify-center overflow-hidden transition-all duration-500 bg-black shadow-xl",
                      status === 'success' && "border-green-500/50"
                    )}
                  >
                    <TokenLogoDynamic 
                        logoUrl={toToken.iconUrl} 
                        size={32} 
                        chainId={toToken.chainId} 
                        symbol={toToken.symbol} 
                        name={toToken.name}
                    />
                  </motion.div>
                </div>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest truncate w-16 text-center">
                  {toToken.symbol}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
