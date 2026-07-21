'use client';

import { useSwapEngineV2 as useSwapEngine } from '@/hooks/useSwapEngineV2';
import { useSingleTokenDetails } from '@/hooks/useTokenDetails';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Info, 
  ChevronDown,
  Zap,
  Loader2,
  ShieldAlert,
  BarChart3,
  ShieldCheck,
  Globe,
  Activity,
  Fuel,
  Settings2
} from 'lucide-react';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import RechartsChart from '@/components/RechartsChart';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import TransactionConfirmationSheet from '@/components/wallet/transaction-confirmation-sheet';
import GlobalTokenSelector from '@/components/shared/global-token-selector';

export default function DesktopSwap() {
  const {
    fromToken,
    toToken,
    amount,
    setAmount,
    isQuoteLoading,
    selectedQuote,
    fetchError,
    handleOpenSelector,
    setIsConfirmOpen,
    needsApproval,
    executeApproval,
    executeSwap,
    isConfirmOpen,
    fromTokenPrice,
    toTokenPrice,
    formatFiat,
    handleSwapTokens,
    handleFinalConfirm,
    handleTokenSelect,
    isExecuting,
    rotation,
    isLowBalance,
    isSelectorOpen,
    setIsSelectorOpen,
    slippage,
    setSlippage
  } = useSwapEngine();

  const { data: fromStats } = useSingleTokenDetails(fromToken?.coingeckoId);
  const { data: toStats } = useSingleTokenDetails(toToken?.coingeckoId);

  // REGISTRY BOOT LOADER
  if (!fromToken || !toToken) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#050505] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-xs font-black uppercase tracking-widest text-primary/40">Synchronizing Liquidity Nodes...</span>
      </div>
    );
  }

  const isButtonDisabled = !amount || parseFloat(amount) <= 0 || isQuoteLoading || !!fetchError || !selectedQuote || isLowBalance;

  return (
    <div className="hidden md:grid grid-cols-12 gap-6 p-6 h-full bg-[#050505] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      {/* LEFT PANEL: PRICE DISCOVERY */}
      <div className="col-span-3 flex flex-col gap-6">
        <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">Price Discovery</h2>
            </div>
            <span className="text-[8px] font-black text-green-500 uppercase bg-green-500/10 px-2 py-0.5 rounded-full">Live Node</span>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TokenLogoDynamic 
                logoUrl={fromToken.iconUrl} 
                symbol={fromToken.symbol} 
                name={fromToken.name} 
                size={20} 
                chainId={fromToken.chainId} 
              />
              <h3 className="text-xl font-black text-white tracking-tight">{fromToken.symbol}/USD</h3>
            </div>
            <div className="flex items-baseline gap-3">
              <p className="text-2xl font-black text-white tabular-nums">{formatFiat(fromTokenPrice)}</p>
              <div className={cn(
                  "text-[10px] font-black flex items-center gap-1",
                  (fromToken.pctChange24h || 0) >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {(fromToken.pctChange24h || 0) >= 0 ? '▲' : '▼'} {Math.abs(fromToken.pctChange24h || 0).toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="h-48 -mx-2 relative">
            <RechartsChart 
              key={fromToken.symbol}
              coingeckoId={fromToken.coingeckoId} 
              days="24H" 
              isNegative={(fromToken.pctChange24h || 0) < 0}
              chainId={fromToken.chainId}
              contractAddress={fromToken.address}
              currentPrice={fromTokenPrice}
            />
          </div>

          <div className="pt-4 border-t border-white/5 space-y-4">
            <div>
                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">Registry Provenance</p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <TokenLogoDynamic logoUrl={fromToken.iconUrl} size={32} symbol={fromToken.symbol} name={fromToken.name} />
                        <div>
                            <p className="text-xs font-black text-white">{fromToken.name}</p>
                            <p className="text-[10px] font-mono text-white/40 truncate w-32">
                              {fromToken.address || 'Native Node'}
                            </p>
                        </div>
                    </div>
                    <ShieldCheck className="w-4 h-4 text-primary opacity-40" />
                </div>
            </div>
          </div>
        </section>
      </div>

      {/* CENTER PANEL: SWAP TERMINAL */}
      <div className="col-span-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-[480px] space-y-6">
          <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Registry Swap</h2>
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">Verified Institutional Router</p>
              </div>
          </div>

          {/* SLIPPAGE SETTINGS QUICK BAR */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-white/40" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Slippage Tolerance</span>
              </div>
              <div className="flex items-center gap-2">
                  {[0.1, 0.5, 1.0].map((val) => (
                      <button
                          key={val}
                          onClick={() => setSlippage(val)}
                          className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-black transition-all",
                              slippage === val ? "bg-primary text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                          )}
                      >
                          {val}%
                      </button>
                  ))}
                  <div className="relative">
                    <Input 
                        type="number"
                        value={slippage}
                        onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.1)}
                        className="w-16 h-6 bg-white/5 border-none text-[10px] font-black text-right pr-4 focus-visible:ring-0"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-black text-white/20">%</span>
                  </div>
              </div>
          </div>

          <div className="space-y-1.5 relative">
              <div className="bg-white/[0.03] rounded-[2.5rem] p-8 border border-white/5 hover:border-white/10 transition-all group shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16" />
                  <div className="flex justify-between items-center mb-4 relative z-10">
                      <button onClick={() => handleOpenSelector('from')} className="flex items-center gap-3 bg-black/40 hover:bg-black/60 px-4 py-2 rounded-2xl border border-white/10 transition-all active:scale-95 group">
                          <TokenLogoDynamic logoUrl={fromToken.iconUrl} symbol={fromToken.symbol} name={fromToken.name} chainId={fromToken.chainId} size={24} />
                          <span className="font-black text-sm text-white uppercase tracking-tight">{fromToken.symbol}</span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Available Balance</p>
                        <p className="text-xs font-bold text-white/60">{parseFloat(fromToken.balance || '0').toLocaleString()} {fromToken.symbol}</p>
                      </div>
                  </div>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-5xl font-black text-white bg-transparent border-none p-0 h-auto focus-visible:ring-0 tracking-tighter placeholder:text-white/5"
                  />
                  <p className="text-sm font-bold text-primary mt-2">≈ {formatFiat(parseFloat(amount || '0') * fromTokenPrice)}</p>
              </div>

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <motion.button 
                    animate={{ rotate: rotation }}
                    transition={{ type: 'spring', damping: 15 }}
                    onClick={handleSwapTokens} 
                    className="w-14 h-14 rounded-2xl bg-[#050505] border-2 border-white/5 flex items-center justify-center text-primary shadow-[0_0_40px_rgba(139,92,246,0.3)] hover:scale-110 active:scale-90 transition-all"
                  >
                      <Zap className="w-6 h-6 fill-current" />
                  </motion.button>
              </div>

              <div className="bg-white/[0.03] rounded-[2.5rem] p-8 border border-white/5 hover:border-white/10 transition-all shadow-2xl relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -ml-16 -mb-16" />
                  <div className="flex justify-between items-center mb-4 relative z-10">
                      <button onClick={() => handleOpenSelector('to')} className="flex items-center gap-3 bg-black/40 hover:bg-black/60 px-4 py-2 rounded-2xl border border-white/10 transition-all active:scale-95 group">
                        <TokenLogoDynamic logoUrl={toToken.iconUrl} symbol={toToken.symbol} name={toToken.name} chainId={toToken.chainId} size={24} />
                        <span className="font-black text-sm text-white uppercase tracking-tight">{toToken.symbol}</span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Est. Rate</p>
                        <p className="text-xs font-bold text-white/60">1 {fromToken.symbol} ≈ {(fromTokenPrice / (toTokenPrice || 1)).toFixed(4)} {toToken.symbol}</p>
                      </div>
                  </div>
                  <div className="min-h-[60px] flex items-center">
                    {isQuoteLoading ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-2xl font-black text-white/20 uppercase tracking-widest animate-pulse">Syncing Liquidity...</span>
                      </div>
                    ) : fetchError ? (
                      <div className="flex items-center gap-3 text-red-500 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 w-full">
                        <ShieldAlert className="w-6 h-6"/>
                        <span className="text-sm font-bold uppercase tracking-tight">{fetchError}</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-5xl font-black text-white tracking-tighter tabular-nums">
                          {selectedQuote ? selectedQuote.receiveAmount.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '0.00'}
                        </p>
                        <p className="text-sm font-bold text-white/20">≈ {formatFiat((selectedQuote?.receiveAmount || 0) * toTokenPrice)}</p>
                      </div>
                    )}
                  </div>
              </div>
          </div>

          <div className="pt-4 space-y-4">
              <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-white/40">
                    <div className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-primary" /> <span>{selectedQuote?.provider || 'Syncing'}</span></div>
                    <div className="flex items-center gap-1.5"><Fuel className="w-3 h-3 text-primary" /> <span>{selectedQuote?.fee ? `$${selectedQuote.fee.toFixed(2)}` : 'Low Gas'}</span></div>
                  </div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{isLowBalance ? 'Insufficient Balance' : 'Protocol Safe'}</p>
              </div>
              <Button
                className={cn(
                  "w-full h-20 rounded-[2rem] text-xl font-black tracking-[0.1em] shadow-2xl transition-all active:scale-95 border-b-8 uppercase",
                  isButtonDisabled ? "bg-zinc-900 border-zinc-950 opacity-50 grayscale" : "bg-primary hover:bg-primary/90 border-primary/50 text-white shadow-primary/30"
                )}
                onClick={needsApproval ? executeApproval : () => setIsConfirmOpen(true)}
                disabled={isButtonDisabled}
              >
                {needsApproval ? 'Approve Token Access' : 'Confirm Swap'}
              </Button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: MARKET STATISTICS */}
      <div className="col-span-3 flex flex-col gap-6">
        <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">Market Registry</h2>
            </div>
            <Info className="w-4 h-4 text-white/20" />
          </div>

          <div className="space-y-4">
            <StatRow label="Market Cap" value={formatFiat(toStats?.market_data?.market_cap?.usd || 0)} loading={!toStats} />
            <StatRow label="24h Volume" value={formatFiat(toStats?.market_data?.total_volume?.usd || 0)} loading={!toStats} />
            <StatRow label="24h High" value={formatFiat(toStats?.market_data?.high_24h?.usd || 0)} color="text-green-400" loading={!toStats} />
            <StatRow label="24h Low" value={formatFiat(toStats?.market_data?.low_24h?.usd || 0)} color="text-red-400" loading={!toStats} />
            <StatRow label="Circ. Supply" value={`${(toStats?.market_data?.circulating_supply || 0).toLocaleString()} ${toToken.symbol}`} loading={!toStats} />
          </div>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Target Depth</p>
                    <p className="text-xs font-bold text-white">Institutional Grade</p>
                </div>
                <Zap className="w-5 h-5 text-primary fill-primary animate-pulse" />
            </div>
            
            <div className="space-y-3 px-1">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Protocol Audit</p>
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-[10px] font-bold text-white/60">Liquidity Nodes Synchronized</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-[10px] font-bold text-white/60">Router Path Authenticated</p>
                </div>
            </div>
          </div>
        </section>
      </div>

      <GlobalTokenSelector isOpen={isSelectorOpen} onOpenChange={setIsSelectorOpen} onSelect={handleTokenSelect} title="Sync Node" isSwapContext={true} />
      <TransactionConfirmationSheet isOpen={isConfirmOpen} onOpenChange={setIsConfirmOpen} onConfirm={handleFinalConfirm} isSubmitting={isExecuting} amount={amount} token={fromToken} recipientName={toToken.symbol} recipientAddress={''} totalFeeUsd={selectedQuote?.fee || 0} />
    </div>
  );
}

function StatRow({ label, value, color = "text-white", loading = false }: { label: string, value: string, color?: string, loading?: boolean }) {
    return (
        <div className="flex justify-between items-center group">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover:text-white/60 transition-colors">{label}</span>
            {loading ? (
                <div className="h-3 w-20 bg-white/5 animate-pulse rounded" />
            ) : (
                <span className={cn("text-xs font-black tabular-nums", color)}>{value}</span>
            )}
        </div>
    );
}
