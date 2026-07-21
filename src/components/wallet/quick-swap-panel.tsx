'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from '@/contexts/wallet-provider';
import { useUser } from '@/contexts/user-provider';
import { useCurrency } from '@/contexts/currency-provider';
import { 
  Plane, 
  Timer, 
  Fuel, 
  Loader2, 
  X, 
  Zap, 
  ChevronDown,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ShieldOff
} from 'lucide-react';
import TokenLogoDynamic from '../shared/TokenLogoDynamic';
import { cn } from '@/lib/utils';
import { ethers } from 'ethers';
import { useDebounce } from '@/hooks/use-debounce';
import type { AssetRow } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import GlobalTokenSelector from '../shared/global-token-selector';
import { calculateSwapFees, checkPairRestriction } from '@/lib/services/swap-fee-calculator';
import { 
  determineSwapProvider, 
  needsPivotRoute, 
  isSwapSupported, 
  getSwapDisabledReason 
} from '@/lib/services/swap-router';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { useSwapEngine } from '@/hooks/useSwapEngine';

// SHARED LOGIC IMPORT
import { 
  detectAddressType, 
  getDetectedNetworkMeta,
  mapTechnicalError 
} from '@/components/wallet/send/WalletComponents';

interface QuickSwapPanelProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

type ExecutionPhase = 'IDLE' | 'VERIFYING' | 'LIQUIDITY' | 'APPROVING' | 'SENDING' | 'SETTLING' | 'SUCCESS' | 'FAILED' | 'PIVOT_CONVERTING' | 'PIVOT_BRIDGING' | 'PIVOT_FINALIZING';

/**
 * INSTITUTIONAL QUICK SWAP PANEL
 * Version: 8.1.2 (TypeError & Empty Input Fix)
 */
export default function QuickSwapPanel({ isOpen, onOpenChange }: QuickSwapPanelProps) {
  const { allAssets, wallets, infuraApiKey, allChainsMap, prices, refresh } = useWallet();
  const { user, profile, refreshProfile } = useUser();
  const { formatFiat } = useCurrency();
  const { toast } = useToast();

  // Extract engine utilities
  // FIX: Destructuring carefully based on standard hook patterns
  const engine = useSwapEngine();
  const { 
    fromToken, setFromToken, toToken, setToToken, amount, setAmount,
    selectedQuote: quote, isQuoteLoading, quoteError: fetchError,
    executionPhase, isExecuting, executeSwap,
    handleTokenSelect, handleOpenSelector, 
    isSelectorOpen, setIsSelectorOpen, selectionType,
    setQuote, setFetchError, setIsQuoteLoading, getQuote 
  } = engine;

  const debouncedAmount = useDebounce(amount, 500);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const quoteIdRef = useRef<number>(0);

  const isAccountProtected = profile?.is_disabled || profile?.security_locked;

  // Sync initial tokens
  useEffect(() => {
    if (isOpen && allAssets.length >= 2 && !fromToken) {
        const initialFrom = allAssets.find(a => a.symbol !== 'WNC') || allAssets[0];
        setFromToken(initialFrom);
        const initialTo = allAssets.find(a => a.symbol !== initialFrom.symbol && a.symbol !== 'WNC') || allAssets[1];
        setToToken(initialTo);
    }
  }, [isOpen, allAssets, fromToken, setFromToken, setToToken]);

  /**
   * ATOMIC QUOTE HANDSHAKE
   */
  useEffect(() => {
    const fetchQuickQuote = async () => {
      const currentId = ++quoteIdRef.current;

      // FIX: Enhanced check for empty/zero amount to stop unwanted background fetches
      if (!fromToken || !toToken || !debouncedAmount || debouncedAmount.trim() === '' || parseFloat(debouncedAmount) <= 0) {
        if (typeof setQuote === 'function') setQuote(null);
        if (typeof setFetchError === 'function') setFetchError(null);
        if (typeof setIsQuoteLoading === 'function') setIsQuoteLoading(false);
        return;
      }

      // 🛡️ RULES ENGINE CHECK
      if (!isSwapSupported(fromToken.chainId)) {
        setFetchError?.(getSwapDisabledReason(fromToken.chainId) || "Source restricted.");
        setQuote?.(null);
        return;
      }

      if (!isSwapSupported(toToken.chainId)) {
        setFetchError?.(getSwapDisabledReason(toToken.chainId) || "Target restricted.");
        setQuote?.(null);
        return;
      }

      const restriction = checkPairRestriction(fromToken.symbol, toToken.symbol);
      if (restriction.isRestricted) {
        setFetchError?.(restriction.message!);
        setQuote?.(null);
        return;
      }

      setIsQuoteLoading?.(true);
      setFetchError?.(null);

      const emergencyFallbackTimer = setTimeout(() => {
          if (currentId === quoteIdRef.current) {
               setIsQuoteLoading?.(false);
               setFetchError?.("Quote timeout. Network congested.");
          }
      }, 10000);

      try {
        const result = await getQuote(fromToken, toToken, debouncedAmount);

        if (currentId === quoteIdRef.current) {
            setQuote?.(result);
        }
      } catch (e: any) {
        if (currentId === quoteIdRef.current) setFetchError?.("Sync Failure");
      } finally {
        clearTimeout(emergencyFallbackTimer);
        if (currentId === quoteIdRef.current) setIsQuoteLoading?.(false);
      }
    };

    fetchQuickQuote();
  }, [debouncedAmount, fromToken, toToken, setQuote, setFetchError, setIsQuoteLoading, getQuote]);

  const handleExecuteSwap = async () => {
    if (!quote || !fromToken || !toToken || !user || !wallets || !infuraApiKey || isAccountProtected) return;

    setExecutionError(null);

    try {
      const balance = parseFloat(fromToken.balance || '0');
      if (balance < parseFloat(amount)) throw new Error("Funds low.");

      await executeSwap(quote, amount, fromToken, toToken);

      toast({ title: "Swap Authorized", description: "Ledger settlement verified." });

      setTimeout(async () => {
        await refreshProfile(); 
        refresh();
        onOpenChange(false);
        setAmount('');
      }, 3000);

    } catch (e: any) {
      setExecutionError(e.message || "Handshake Aborted.");
    }
  };

  const fromChainColor = fromToken ? (allChainsMap[fromToken.chainId ?? 1]?.themeColor || '#818cf8') : '#818cf8';

  return (
    <>
        <div className={cn("fixed top-3 left-2 right-2 z-[100] transition-all duration-500 ease-in-out pointer-events-none", isOpen ? "translate-y-0 opacity-100" : "-translate-y-[150%] opacity-0")}>
            <div style={{ boxShadow: `0 8px 40px -10px ${fromChainColor}60`, borderColor: `${fromChainColor}40`, backgroundColor: '#050505' }} className="border rounded-[2rem] p-3.5 max-w-lg mx-auto pointer-events-auto shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2 bg-primary/10 px-3 py-0.5 rounded-full border border-primary/20">
                        <Zap className="w-2.5 h-2.5 text-primary fill-primary" />
                        <span className="text-[7px] font-black uppercase tracking-[0.15em] text-primary">QUICK SETTLE</span>
                    </div>
                    <button onClick={() => onOpenChange(false)} className="p-1 rounded-full hover:bg-white/10 transition-colors"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>

                <AnimatePresence mode="wait">
                  {isAccountProtected ? (
                    <motion.div key="protected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 px-2 space-y-3">
                        <div className="flex items-center gap-3 text-red-500">
                            <ShieldOff className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Locked Mode Active</span>
                        </div>
                        <p className="text-[11px] text-red-400/80 font-medium leading-relaxed">
                            Transactional nodes are strictly gated. Visit settings to authorize access.
                        </p>
                    </motion.div>
                  ) : isExecuting ? (
                    <motion.div key="executing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="py-4 space-y-4">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-xl border-2 border-primary/20 flex items-center justify-center bg-white/5">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                                {executionPhase === 'SUCCESS' && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -inset-1 bg-green-500 rounded-xl flex items-center justify-center z-20">
                                        <CheckCircle2 className="w-6 h-6 text-white" />
                                    </motion.div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-white tracking-widest">
                                    {executionPhase === 'VERIFYING' && 'Auditing Identity'}
                                    {executionPhase === 'LIQUIDITY' && 'Locking Node'}
                                    {executionPhase === 'APPROVING' && 'Approving Asset'}
                                    {executionPhase === 'SENDING' && 'Broadcasting Leg 1'}
                                    {executionPhase === 'SETTLING' && 'Clearing Ledger'}
                                    {executionPhase === 'PIVOT_CONVERTING' && 'Converting to Intermediary'}
                                    {executionPhase === 'PIVOT_BRIDGING' && 'Crossing Bridge Node'}
                                    {executionPhase === 'PIVOT_FINALIZING' && 'Fulfilling Target Node'}
                                    {executionPhase === 'SUCCESS' && 'Settlement Verified'}
                                    {executionPhase === 'FAILED' && 'Handshake Failed'}
                                    {executionPhase === 'IDLE' && 'Initializing...'}
                                </p>
                                <p className="text-[7px] font-bold uppercase text-primary tracking-[0.2em] animate-pulse">
                                    {executionPhase === 'SUCCESS' ? 'Registry Updated' : 'Institutional Protocol Active'}
                                </p>
                            </div>
                            {executionError && (
                                <div className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-bold uppercase">
                                    {executionError}
                                </div>
                            )}
                        </div>
                    </motion.div>
                  ) : (
                    <motion.div key="inputs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                        <div className="flex items-center gap-1.5">
                            {/* PAY SLOT */}
                            <div className="flex-1 flex items-center bg-white/[0.03] border border-white/5 rounded-xl h-10 px-3 gap-2">
                                <button onClick={() => handleOpenSelector('from')} className="shrink-0 active:scale-90 transition-all">
                                    <TokenLogoDynamic 
                                      logoUrl={fromToken?.iconUrl} 
                                      alt={fromToken?.symbol || ''} 
                                      size={22} 
                                      chainId={fromToken?.chainId} 
                                      symbol={fromToken?.symbol} 
                                      name={fromToken?.name}
                                    />
                                </button>
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={amount} 
                                    onChange={(e) => setAmount(e.target.value)} 
                                    className="bg-transparent border-none text-xs font-black p-0 h-auto focus-visible:ring-0 text-white placeholder:text-zinc-800" 
                                />
                            </div>

                            <div className="shrink-0 w-7 h-7 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center">
                                <Plane className="w-3 h-3 text-primary" />
                            </div>

                            {/* RECEIVE SLOT */}
                            <div className="flex-1 flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-xl h-10 px-3 gap-2 overflow-hidden">
                                {isQuoteLoading && !quote ? (
                                    <Skeleton className="h-3 w-16 bg-white/10 rounded" />
                                ) : fetchError ? (
                                    <AlertCircle className="w-3 h-3 text-red-500" />
                                ) : (
                                    <span className="text-xs font-black tracking-tight tabular-nums truncate text-white">
                                        {quote?.receiveAmount ? Number(quote.receiveAmount).toFixed(4) : '0.0000'}
                                    </span>
                                )}
                                <button onClick={() => handleOpenSelector('to')} className="shrink-0 active:scale-90 transition-all">
                                    <TokenLogoDynamic 
                                      logoUrl={toToken?.iconUrl} 
                                      alt={toToken?.symbol || ''} 
                                      size={22} 
                                      chainId={toToken?.chainId} 
                                      symbol={toToken?.symbol} 
                                      name={toToken?.name}
                                    />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-3 text-[8px] font-black uppercase text-muted-foreground/50">
                                <div className="flex items-center gap-1">
                                    <Timer className="w-2.5 h-2.5 text-primary" />
                                    <span>{quote?.eta || '~10s'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Fuel className="w-2.5 h-2.5 text-primary" />
                                    <span>{quote?.feeUsd ? `$${Number(quote.feeUsd).toFixed(2)}` : 'LOW GAS'}</span>
                                </div>
                            </div>

                            <Button 
                                size="sm" 
                                className={cn(
                                    "h-7 px-4 rounded-xl font-black text-[8px] uppercase tracking-widest",
                                    isExecuting ? "bg-zinc-800" : "bg-primary hover:bg-primary/90"
                                )} 
                                disabled={!amount || isQuoteLoading || !!fetchError || isExecuting}
                                onClick={handleExecuteSwap}
                            >
                                {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : "EXECUTE"}
                            </Button>
                        </div>

                        {fetchError && (
                            <div className="mt-2 px-1 flex items-center gap-1.5">
                                <AlertCircle className="w-2.5 h-2.5 text-red-500" />
                                <span className="text-[7px] font-bold text-red-400 uppercase truncate">{fetchError}</span>
                            </div>
                        )}
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>
        </div>

        <GlobalTokenSelector 
            isOpen={isSelectorOpen}
            onOpenChange={setIsSelectorOpen}
            onSelect={handleTokenSelect}
            title="Switch Network"
            isSwapContext={true}
        />
    </>
  );
}
