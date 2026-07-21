'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, SendHorizonal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TokenLogoDynamic from '../shared/TokenLogoDynamic';
import { cn } from '@/lib/utils';

interface TransactionStatusCardProps {
  isVisible: boolean;
  status: 'pending' | 'success' | 'error';
  senderAvatar?: string;
  senderName: string;
  recipientAvatar?: string;
  recipientName: string;
  token?: {
    symbol: string;
    iconUrl?: string | null;
    chainId: number;
    name?: string;
  };
  recipientToken?: {
    symbol: string;
    iconUrl?: string | null;
    chainId: number;
    name?: string;
  };
  label?: string;
  isRawAddress?: boolean;
}

/**
 * INSTITUTIONAL TRANSACTION STATUS OVERLAY
 * Version: 9.0.0 (Custom Label & Swap Logic)
 * 
 * Rules:
 * 1. HIGH-Z: Z-index 500 to clear all sheets and overlays.
 * 2. DYNAMIC: Supports 'pending', 'success', and 'error' states with custom text.
 */
export default function TransactionStatusCard({
  isVisible,
  status,
  senderAvatar,
  senderName,
  recipientAvatar,
  recipientName,
  token,
  recipientToken,
  label,
  isRawAddress
}: TransactionStatusCardProps) {
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
              {/* SENDER NODE */}
              <div className="flex flex-col items-center gap-2 min-w-[70px]">
                <div className="relative">
                  <motion.div
                    animate={status === 'pending' ? { rotate: 360 } : {}}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className={cn(
                      "absolute -inset-1.5 border-2 rounded-full transition-colors duration-500",
                      status === 'pending' ? "border-dashed border-primary/40" : "border-transparent"
                    )}
                  />
                  <Avatar className="w-12 h-12 border-2 border-white/10 rounded-2xl shadow-xl bg-black">
                    <AvatarImage src={senderAvatar} alt="Sender" />
                    <AvatarFallback className="bg-primary/20 text-primary font-black text-xs">
                      {senderName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-black rounded-lg p-0.5 border border-white/10 shadow-xl z-20">
                    <TokenLogoDynamic 
                      logoUrl={token?.iconUrl} 
                      size={16} 
                      chainId={token?.chainId || 1} 
                      symbol={token?.symbol || 'T'} 
                      name={token?.name}
                    />
                  </div>
                </div>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest truncate w-16 text-center">
                  {senderName}
                </span>
              </div>

              {/* TRAJECTORY PATH */}
              <div className="flex-1 flex flex-col items-center justify-center px-6">
                <div className="w-full relative h-8">
                  <div className="absolute top-1/2 left-0 right-0 h-[1.5px] border-t border-dashed border-white/10 -translate-y-1/2" />
                  <motion.div
                    animate={
                      status === 'pending' 
                        ? { x: [-20, 100], opacity: [0, 1, 1, 0] }
                        : status === 'success'
                        ? { x: 100, opacity: 0 }
                        : { opacity: 0 }
                    }
                    transition={
                      status === 'pending' 
                        ? { duration: 1.2, repeat: Infinity, ease: "linear" }
                        : { duration: 0.3 }
                    }
                    className="absolute top-1/2 left-0 -translate-y-1/2 text-primary drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]"
                  >
                    <SendHorizonal className="w-5 h-5 fill-primary" />
                  </motion.div>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-[0.2em] text-center px-4",
                    status === 'success' ? "text-green-500" : status === 'error' ? "text-red-500" : "text-primary"
                  )}>
                    {label || (status === 'pending' ? 'BROADCASTING' : status === 'success' ? 'CONFIRMED' : 'FAILED')}
                  </span>
                </div>
              </div>

              {/* RECIPIENT NODE */}
              <div className="flex flex-col items-center gap-2 min-w-[70px]">
                <div className="relative">
                  <motion.div
                    animate={status === 'success' ? { 
                      scale: [1, 1.1, 1],
                      boxShadow: ["0 0 0px #8b5cf6", "0 0 30px #8b5cf6", "0 0 0px #8b5cf6"]
                    } : {}}
                    transition={{ duration: 1, repeat: status === 'success' ? Infinity : 0 }}
                    className={cn(
                      "w-12 h-12 rounded-2xl border-2 border-white/10 flex items-center justify-center overflow-hidden transition-all duration-500 bg-black/40 shadow-xl",
                      status === 'success' && "border-primary/50"
                    )}
                  >
                    {recipientToken ? (
                      <TokenLogoDynamic 
                        logoUrl={recipientToken.iconUrl} 
                        size={32} 
                        chainId={recipientToken.chainId} 
                        symbol={recipientToken.symbol} 
                        name={recipientToken.name}
                      />
                    ) : isRawAddress ? (
                      <TokenLogoDynamic 
                        logoUrl={token?.iconUrl} 
                        size={32} 
                        chainId={token?.chainId || 1} 
                        symbol={token?.symbol || 'T'} 
                        name={token?.name}
                      />
                    ) : (
                      <Avatar className="w-full h-full rounded-none">
                        <AvatarImage src={recipientAvatar} alt="Recipient" />
                        <AvatarFallback className="bg-primary/20 text-primary font-black text-xs">
                          {recipientName[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </motion.div>

                  <AnimatePresence>
                    {status !== 'pending' && (
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className={cn(
                          "absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#0a0a0c] text-white shadow-2xl z-[30]",
                          status === 'success' ? "bg-green-500" : "bg-red-500"
                        )}
                      >
                        {status === 'success' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest truncate w-16 text-center">
                  {recipientName}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
