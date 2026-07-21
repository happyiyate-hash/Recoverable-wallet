
'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import TokenLogoDynamic from '../shared/TokenLogoDynamic';
import { useCurrency } from '@/contexts/currency-provider';
import { cn } from '@/lib/utils';
import type { AssetRow } from '@/lib/types';
import { 
  X, 
  Zap, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  History,
  Workflow,
  Fuel,
  Repeat,
  ChevronDown
} from 'lucide-react';
import { DialogTitle, DialogDescription, ScrollArea } from '@radix-ui/react-dialog';

interface SwapConfirmationSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isExecuting: boolean;
  executionPhase: string;
  executionError: string | null;
  txHash?: string;
  amount: string;
  fromToken: AssetRow | null;
  toToken: AssetRow | null;
  quote: any | null;
  slippage: number;
}

/**
 * INSTITUTIONAL SWAP CONFIRMATION TERMINAL
 * Version: 1.1.0 (Accessibility Standard Patch)
 */
export default function SwapConfirmationSheet({
  isOpen,
  onOpenChange,
  onConfirm,
  isExecuting,
  executionPhase,
  executionError,
  txHash,
  amount,
  fromToken,
  toToken,
  quote,
  slippage
}: SwapConfirmationSheetProps) {
  const { formatFiat } = useCurrency();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // 🛡️ DATA INTEGRITY NODES
  const isValid = useMemo(() => {
    return fromToken && toToken && amount && !isNaN(parseFloat(amount)) && quote;
  }, [fromToken, toToken, amount, quote]);

  const fromAmountNum = parseFloat(amount) || 0;
  const receiveAmount = quote?.receiveAmount || 0;
  const rate = fromAmountNum > 0 ? receiveAmount / fromAmountNum : 0;
  
  const fromValueUsd = fromAmountNum * (fromToken?.priceUsd || 0);
  const toValueUsd = receiveAmount * (toToken?.priceUsd || 0);

  const isSuccess = executionPhase === 'SUCCESS';
  const isFailed = executionPhase === 'FAILED';

  const formatSafe = (val: number) => {
    if (isNaN(val) || !isFinite(val)) return '--';
    return val.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  return (
    <AnimatePresence>
      {isOpen && fromToken && toToken && quote && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => !isExecuting && onOpenChange(false)} 
            className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-md" 
          />
          <motion.div
            initial={{ y: -600, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: -600, x: '-50%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[140] w-full max-w-lg bg-[#0a0a0c] border-b border-white/10 rounded-b-[3rem] shadow-[0_20px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
          >
            {/* PROGRESS RAIL */}
            <div className="absolute top-0 inset-x-0 h-1 bg-white/5 overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={isExecuting ? { width: '100%' } : { width: isSuccess ? '100%' : 0 }}
                    transition={isExecuting ? { duration: 15, ease: "linear" } : { duration: 0.5 }}
                    className={cn(
                        "h-full transition-colors duration-500",
                        isSuccess ? "bg-green-500" : isFailed ? "bg-red-500" : "bg-primary"
                    )}
                />
            </div>

            <DialogTitle className="sr-only">Confirm Swap Handshake</DialogTitle>
            <DialogDescription className="sr-only">Verify the liquidity route and expected output before authorizing the atomic swap.</DialogDescription>

            <header className="p-6 pt-8 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-lg">
                        <Repeat className={cn("w-5 h-5", isExecuting && "animate-spin")} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                            {isSuccess ? 'Swap Settled' : isFailed ? 'Swap Failed' : isExecuting ? 'Executing Handshake' : 'Confirm Swap'}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <ShieldCheck className="w-2.5 h-2.5 text-primary/60" />
                            <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Verified Institutional Node</span>
                        </div>
                    </div>
                </div>
                {!isExecuting && (
                    <button onClick={() => onOpenChange(false)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                )}
            </header>

            <div className="flex-1 max-h-[70vh] overflow-y-auto">
              <div className="p-8 space-y-10">
                
                {/* 🌀 KINETIC SWAP VISUAL */}
                <section className="flex items-center justify-between px-4">
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative p-1">
                            <motion.div 
                                animate={isExecuting ? { rotate: 360 } : { rotate: 0 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20" 
                            />
                            <div className="relative z-10 bg-black rounded-full border-2 border-white/5 shadow-2xl p-1.5">
                                <TokenLogoDynamic logoUrl={fromToken?.iconUrl} size={48} symbol={fromToken?.symbol} chainId={fromToken?.chainId} />
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-white/60 uppercase">{fromToken?.symbol}</span>
                    </div>

                    <div className="flex-1 px-8 relative h-10">
                        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-px bg-white/5">
                            <motion.div 
                                animate={isSuccess ? { opacity: 0 } : { x: ['-20%', '120%'], opacity: [0, 1, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                className="h-full w-12 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                            />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-[#0a0a0c] p-2 border border-white/5 rounded-xl shadow-xl">
                                {isSuccess ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : isFailed ? <AlertCircle className="w-5 h-5 text-red-500" /> : <Zap className="w-5 h-5 text-primary fill-primary animate-pulse" />}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                        <div className="relative p-1">
                            <motion.div 
                                animate={isExecuting ? { rotate: -360 } : { rotate: 0 }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20" 
                            />
                            <div className="relative z-10 bg-black rounded-full border-2 border-white/5 shadow-2xl p-1.5">
                                <TokenLogoDynamic logoUrl={toToken?.iconUrl} size={48} symbol={toToken?.symbol} chainId={toToken?.chainId} />
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-white/60 uppercase">{toToken?.symbol}</span>
                    </div>
                </section>

                <AnimatePresence mode="wait">
                  {isSuccess ? (
                    <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center">
                        <div className="p-6 rounded-[2.5rem] bg-green-500/5 border border-green-500/20 space-y-2 shadow-inner">
                            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Settlement Complete</p>
                            <h2 className="text-3xl font-black text-white tracking-tighter">+{formatSafe(receiveAmount)} {toToken?.symbol}</h2>
                            <p className="text-xs font-bold text-white/40">Value: {formatFiat(toValueUsd)}</p>
                        </div>
                        {txHash && (
                            <button className="flex items-center justify-center gap-2 mx-auto text-[10px] font-black text-primary hover:underline uppercase tracking-widest bg-primary/5 px-4 py-2 rounded-xl border border-primary/20 transition-all">
                                <span>Registry Proof: {txHash.slice(0, 12)}...</span>
                                <ExternalLink className="w-3 h-3" />
                            </button>
                        )}
                    </motion.div>
                  ) : isFailed ? (
                    <motion.div key="failed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center">
                        <div className="p-6 rounded-[2.5rem] bg-red-500/5 border border-red-500/20 space-y-2">
                            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                            <p className="text-xs font-bold text-red-400 leading-relaxed uppercase">{executionError || "Identity Handshake Aborted."}</p>
                        </div>
                        <Button onClick={onConfirm} className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 font-black uppercase text-xs">Retry Dispatch</Button>
                    </motion.div>
                  ) : (
                    <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                        <div className="grid grid-cols-1 gap-2">
                            <div className="p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col items-center gap-1 shadow-inner">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em]">Paying From Node</p>
                                <h3 className="text-2xl font-black text-white tabular-nums">{formatSafe(fromAmountNum)} {fromToken?.symbol}</h3>
                                <p className="text-[10px] font-bold text-primary/60">{formatFiat(fromValueUsd)}</p>
                            </div>
                            <div className="p-6 rounded-[2.5rem] bg-white/[0.04] border border-white/10 flex flex-col items-center gap-1 shadow-xl">
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">Receiving At Node</p>
                                <h3 className="text-3xl font-black text-white tabular-nums">{formatSafe(receiveAmount)} {toToken?.symbol}</h3>
                                <p className="text-[10px] font-bold text-primary">≈ {formatFiat(toValueUsd)}</p>
                            </div>
                        </div>

                        <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                            <button onClick={() => setIsDetailsOpen(!isDetailsOpen)} className="w-full flex items-center justify-between group">
                                <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Protocol Intelligence</span>
                                <ChevronDown className={cn("w-4 h-4 text-white/20 transition-transform duration-500", isDetailsOpen && "rotate-180")} />
                            </button>
                            
                            <AnimatePresence>
                                {isDetailsOpen && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4 pt-2 overflow-hidden">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-primary/40">
                                                    {quote?.logo ? (
                                                        <img src={quote.logo} alt="" className="w-4 h-4 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                    ) : (
                                                        <Workflow className="w-3.5 h-3.5" />
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Router</span>
                                            </div>
                                            <span className="text-[10px] font-black text-white">{quote?.providerName || 'Route Provider Unavailable'}</span>
                                        </div>
                                        <DetailRow icon={Fuel} label="Gas Node" value={`$${(quote?.gasUsd || 0.05).toFixed(2)}`} />
                                        <DetailRow icon={History} label="Est. Time" value={quote?.eta || '~15s'} />
                                        <DetailRow icon={Zap} label="Slippage" value={`${slippage || 0.5}%`} />
                                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/40">
                                            <span>Rate</span>
                                            <span>1 {fromToken?.symbol} ≈ {formatSafe(rate)} {toToken?.symbol}</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <footer className="p-8 bg-black/40 border-t border-white/5 backdrop-blur-3xl shrink-0">
                {!isSuccess && (
                    <div className="space-y-4">
                        <Button 
                            className={cn(
                                "w-full h-18 rounded-[2rem] text-base font-black uppercase tracking-[0.2em] shadow-2xl transition-all border-b-8",
                                isExecuting ? "bg-zinc-900 border-zinc-950 opacity-80" : "bg-primary hover:bg-primary/90 border-primary/50 text-white shadow-primary/20 active:scale-95"
                            )}
                            disabled={!isValid || isExecuting}
                            onClick={onConfirm}
                        >
                            {isExecuting ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>
                                        {(executionPhase === 'VERIFYING' || executionPhase === 'LIQUIDITY') && 'Fetching...'}
                                        {(executionPhase === 'APPROVING' || executionPhase === 'PIVOT_BRIDGING') && 'Routing...'}
                                        {(executionPhase === 'SENDING' || executionPhase === 'SETTLING') && 'Swapping...'}
                                        {executionPhase === 'SUCCESS' && 'Completed ✅'}
                                        {!['VERIFYING', 'LIQUIDITY', 'APPROVING', 'PIVOT_BRIDGING', 'SENDING', 'SETTLING', 'SUCCESS'].includes(executionPhase) && executionPhase}
                                    </span>
                                </div>
                            ) : (
                                "Authorize Swap"
                            )}
                        </Button>
                        <p className="text-center text-[8px] font-black text-white/20 uppercase tracking-widest">
                            {isExecuting ? 'Transaction is broadcasting to the cluster' : 'Registry handshake required for settlement'}
                        </p>
                    </div>
                )}
                {isSuccess && (
                    <Button onClick={() => onOpenChange(false)} className="w-full h-16 rounded-[2rem] bg-white/5 border border-white/10 font-black uppercase text-xs tracking-widest">Return to Terminal</Button>
                )}
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailRow({ icon: Icon, label, value }: any) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-primary/40"><Icon className="w-3.5 h-3.5" /></div>
                <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">{label}</span>
            </div>
            <span className="text-[10px] font-black text-white">{value}</span>
        </div>
    );
}
