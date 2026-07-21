'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  RefreshCw,
  Send,
  HandCoins,
  Repeat,
  History,
  ChevronDown,
  Loader2,
  Copy,
  Bell,
  CheckCircle2,
  Link2,
  Plus,
  ShieldCheck,
  Zap,
  EyeOff,
  Eye,
  Search,
  X,
  QrCode,
  Handshake,
  Settings,
  Wallet,
  ChevronRight,
  ArrowRight,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Crown,
  ShieldOff,
  Clock,
  Timer
} from 'lucide-react';
import { useWallet } from '@/contexts/wallet-provider';
import { useMarket } from '@/contexts/market-provider';
import type { AssetRow } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/currency-provider';
import { useAppTheme } from '@/contexts/theme-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TokenLogoDynamic from './shared/TokenLogoDynamic';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import NetworkSelector from './wallet/network-selector';
import { motion, animate, AnimatePresence } from 'framer-motion';
import TokenManager from './wallet/tokens/token-manager';
import DeFiTab from './wallet/tokens/defi-tab';
import NftTab from './wallet/tokens/nft-tab';
import { Input } from './ui/input';
import { useUser } from '@/contexts/user-provider';
import { useRenderTracker } from '@/lib/telemetry/render-tracker';

/**
 * 🍏 iOS-STYLE MULTI-LINE SPINNER
 */
const IOSSpinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin text-primary">
    {[...Array(12)].map((_, i) => (
      <rect
        key={i}
        x="11"
        y="2"
        width="2"
        height="6"
        rx="1"
        fill="currentColor"
        transform={`rotate(${i * 30} 12 12)`}
        style={{ opacity: 0.1 + (i / 12) }}
      />
    ))}
  </svg>
);

/**
 * INSTITUTIONAL ANIMATED VALUATION NODE
 */
const AnimatedNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const { formatFiat } = useCurrency();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const controls = animate(displayValue, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplayValue(latest),
    });
    return () => controls.stop();
  }, [value, mounted]);

  return (
    <span className="text-white">
      {formatFiat(displayValue)}
    </span>
  );
};

const TokenRow = React.memo(({ token, isDisabled }: { token: AssetRow, isDisabled: boolean }) => {
  const router = useRouter();
  const { formatFiat } = useCurrency();
  const isPositiveChange = (token.pctChange24h ?? 0) >= 0;

  const handleRowClick = () => {
    router.push(`/token-details?symbol=${encodeURIComponent(token.symbol ?? '')}&chainId=${token.chainId}`);
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={handleRowClick}
      className="flex cursor-pointer items-center justify-between p-4 bg-card border border-white/10 rounded-[2rem] transition-all w-full mb-2 shadow-[0_8px_30px_rgba(0,0,0,0.4),inset_0_1px_0px_rgba(255,255,255,0.03)] active:brightness-125 group relative overflow-hidden"
      role="button"
    >
      <div className="flex items-center gap-3 relative z-10">
        <div className="relative shrink-0">
          <TokenLogoDynamic 
              alt={token.symbol} 
              logoUrl={token.iconUrl}
              symbol={token.symbol}
              name={token.name}
              size={36}
              chainId={token.chainId}
          />
        </div>
        <div className="flex flex-col min-w-0">
          <p className="font-black text-[12px] text-white uppercase leading-none mb-1 truncate">{token.symbol}</p>
          {isDisabled ? (
            <span className="text-[12px] font-black tracking-[0.2em] text-white/10 leading-none mt-1">••••</span>
          ) : (
            <p className="text-[10px] text-white/60 font-mono font-bold tabular-nums">
              {parseFloat(token.balance || '0').toLocaleString('en-US', { maximumFractionDigits: 4 })}
            </p>
          )}
        </div>
      </div>
      <div className="text-right relative z-10 shrink-0">
        {isDisabled ? (
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-black text-white/10 leading-none">••••</span>
            <span className="text-[8px] font-black text-white/5 leading-none">••••</span>
          </div>
        ) : (
          <>
            <p className="font-black text-sm text-white leading-none tabular-nums">
              {formatFiat(token.fiatValueUsd ?? 0)}
            </p>
            <p className={cn(
              'text-[9px] font-black mt-1.5',
              isPositiveChange ? 'text-green-500' : 'text-red-500'
            )}>
              {isPositiveChange ? '▲' : '▼'} {Math.abs(token.pctChange24h ?? 0).toFixed(2)}%
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
});

TokenRow.displayName = 'TokenRow';

/**
 * ISOLATED ACTION NODE
 */
function ActionNode({ 
  icon: Icon, 
  label, 
  onClick, 
  isActive,
  onPress,
  onRelease
}: { 
  icon: any, 
  label: string, 
  onClick: () => void,
  isActive: boolean,
  onPress: () => void,
  onRelease: () => void
}) {
  return (
    <motion.button 
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      onPointerDown={onPress}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      className="flex flex-col items-center gap-2 transition-all flex-1 py-1 relative outline-none group"
    >
      <div className={cn(
        "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-2xl shrink-0 border",
        isActive 
          ? "bg-primary/20 border-primary/60 text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]" 
          : "bg-white/[0.02] border-white/10 text-white/40 shadow-2xl group-hover:border-white/20 group-hover:bg-white/[0.04]"
      )}>
        <Icon className={cn(
          "w-5 h-5 transition-all duration-300",
          isActive ? "scale-110 text-primary" : "text-white/70 group-hover:text-white"
        )} />
      </div>
      <span className={cn(
        "text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-300",
        isActive ? "text-primary" : "text-white/70 group-hover:text-white"
      )}>
        {label}
      </span>
      
      <AnimatePresence>
        {isActive && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -inset-1 bg-primary/5 blur-xl rounded-full -z-10"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default function WalletTab({ computedAssets }: { computedAssets: AssetRow[] }) {
  const { 
    isRequestOverlayOpen,
    setIsRequestOverlayOpen, 
    viewingNetwork, 
    wallets, 
    getAddressForChain, 
    setIsNotificationsOpen, 
    notifications,
    prices,
    isQuickSwapOpen,
    setIsQuickSwapOpen,
    isInitialized,
    isSynced,
    refresh,
    isRefreshing
  } = useWallet();
  const { profile, isBalanceHidden, setIsBalanceHidden, user } = useUser();
  const { formatFiat, rates, selectedCurrency } = useCurrency();
  const { activeTheme } = useAppTheme();
  const [activeTab, setActiveTab] = useState('tokens');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1H' | '24H' | '7D' | '30D' | '1Y'>('24H');
  const [history, setHistory] = useState<{ ts: number; val: number }[]>([]);
  const [isTokenManagerOpen, setIsTokenManagerOpen] = useState(false);
  const [isIdCopied, copy] = useCopyToClipboard();
  const router = useRouter();

  // 🛡️ TELEMETRY AUDIT
  useRenderTracker('WalletTab', {
    activeTab,
    selectedTimeframe,
    searchTerm,
    isInitialized,
    assetsCount: computedAssets?.length
  });

  // 🛡️ ISOLATED STATE REGISTRY
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const unreadCount = notifications.unread_count || 0;

  useEffect(() => {
    if (!user?.id) return;
    const saved = localStorage.getItem(`ss-balance-history-${user.id}`);
    if (saved) {
      try {setHistory(JSON.parse(saved));
      } catch (e) {
        console.warn("[HISTORY_ADVISORY] Logic node corrupted.");
      }
    }
  }, [user?.id]);

  const currentTotalUsd = useMemo(() => {
    return computedAssets.reduce((sum, asset) => sum + (asset?.fiatValueUsd ?? 0), 0);
  }, [computedAssets]);

  useEffect(() => {
    if (!user?.id || currentTotalUsd <= 0) return;

    const snapshot = () => {
      setHistory(prev => {
        const now = Date.now();
        const last = prev[prev.length - 1];
        
        const oneHour = 3600000;
        if (last && (now - last.ts < oneHour) && Math.abs(currentTotalUsd - last.val) / last.val < 0.01) {
          return prev;
        }

        const next = [...prev, { ts: now, val: currentTotalUsd }].slice(-100);
        localStorage.setItem(`ss-balance-history-${user.id}`, JSON.stringify(next));
        return next;
      });
    };
    const timer = setTimeout(snapshot, 2000);
    return () => clearTimeout(timer);
  }, [currentTotalUsd, user?.id]);

  const { totalChange, changeAbsolute, displayBalance } = useMemo(() => {
    let yesterdayTotalUsd = 0;
    for (const asset of computedAssets) {
      if (!asset) continue;
      const currentPriceUsd = asset.priceUsd ?? 0;
      const changePercent = asset.pctChange24h ?? 0;
      const balance = parseFloat(asset.balance || '0') || 0;
      if (!currentPriceUsd || !balance) continue;
      
      let multiplier = 1;
      if (selectedTimeframe === '1H') multiplier = 0.1;
      if (selectedTimeframe === '7D') multiplier = 3.5;
      if (selectedTimeframe === '30D') multiplier = 12;
      if (selectedTimeframe === '1Y') multiplier = 45;

      const effectiveChange = changePercent * multiplier;
      const denom = 1 + (effectiveChange / 100);
      yesterdayTotalUsd += (currentPriceUsd / (denom || 1)) * balance;
    }

    const deltaPercent = yesterdayTotalUsd === 0 ? 0 : ((currentTotalUsd - yesterdayTotalUsd) / yesterdayTotalUsd) * 100;
    const deltaAbsolute = currentTotalUsd - yesterdayTotalUsd;

    let targetVal = currentTotalUsd;
    if (selectedTimeframe !== '24H' && history.length > 0) {
        const durations: Record<string, number> = {
            '1H': 3600000,
            '7D': 604800000,
            '30D': 2592000000,
            '1Y': 31536000000
        };
        const targetTs = Date.now() - durations[selectedTimeframe];
        const closest = history.reduce((prev, curr) => {
            return Math.abs(curr.ts - targetTs) < Math.abs(prev.ts - targetTs) ? curr : prev;
        });

        if (Math.abs(closest.ts - targetTs) < (durations[selectedTimeframe] / 2)) {
            targetVal = closest.val;
        }
    }

    return { 
      totalChange: deltaPercent, 
      changeAbsolute: deltaAbsolute,
      displayBalance: targetVal
    };
  }, [computedAssets, selectedTimeframe, currentTotalUsd, history]);

  const filteredAssets = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return computedAssets;
    return computedAssets.filter(a => 
      a.symbol.toLowerCase().includes(term) || 
      a.name.toLowerCase().includes(term)
    );
  }, [computedAssets, searchTerm]);

  const address = wallets ? getAddressForChain(viewingNetwork, wallets) : null;

  return (
    <div className="flex flex-col h-[100dvh] bg-background relative overflow-hidden">
      
      <div className="flex-none bg-transparent z-[110] pb-1">
        
        {/* TOP NAVIGATION OVERLAY */}
        <header className="px-3 pt-3 pb-2 flex items-center justify-between bg-transparent h-16 relative z-[120]">
            <div className="flex-1 flex items-center justify-start gap-0.5">
                <NetworkSelector className="p-0 h-auto w-auto bg-transparent border-none shadow-none text-primary scale-90" />
                <button 
                  onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                  className="p-1 text-primary hover:text-white transition-all active:scale-90"
                >
                  {isBalanceHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center bg-black/80 backdrop-blur-xl border border-primary/40 rounded-2xl p-0.5 shadow-2xl group z-10">
                <button 
                  onClick={() => address && copy(address)}
                  className="px-4 py-1.5 flex items-center gap-2 active:scale-95 transition-all"
                >
                  <span className={cn("text-[9px] font-mono font-black uppercase transition-colors", isIdCopied ? "text-green-400" : "text-white/80")}>
                    {isIdCopied ? 'Copied' : address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Sync...'}
                  </span>
                  <div className="flex items-center justify-center">
                    {isIdCopied ? <CheckCircle2 className="w-2.5 h-2.5 text-green-500" /> : <Copy className="w-2.5 h-2.5 text-primary group-hover:text-primary transition-colors" />}
                  </div>
                </button>
            </div>

            <div className="flex-1 flex items-center justify-end gap-2">
              <button 
                onClick={() => router.push('/connect')}
                className="p-1.5 text-primary hover:text-white transition-all active:scale-90"
              >
                <Link2 className="w-4 h-4" />
              </button>
              <button onClick={() => setIsNotificationsOpen(true)} className="relative p-1.5 hover:text-primary transition-all">
                <Bell className="w-4 h-4 text-white/60" />
                {unreadCount > 0 && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_12px_rgba(var(--primary),0.9)]" />}
              </button>
            </div>
        </header>

        {/* 💳 INSTITUTIONAL VALUATION HERO */}
        <div className="relative mt-0">
          <section className="relative overflow-hidden flex flex-col min-h-[140px] group transition-all duration-300">
            <div className="px-4 pt-1 flex justify-between items-start relative z-20">
                <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-white/40 tracking-[0.3em] px-1">Institutional Valuation</span>
                    <div className="flex flex-col items-start mt-1">
                        {isBalanceHidden ? (
                            <div className="flex flex-col items-start gap-1">
                                <h1 className="text-5xl font-black tracking-tighter text-white/20 leading-none px-1">••••••</h1>
                                <div className="text-[10px] font-black text-white/10 tracking-[0.2em] px-1.5">••••</div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-4xl font-black text-white tracking-tighter tabular-nums drop-shadow-2xl px-1">
                                    <AnimatedNumber value={displayBalance} />
                                </h1>
                                
                                <div className={cn(
                                    "flex items-center gap-1.5 font-black transition-colors duration-500 px-1 mt-1",
                                    totalChange >= 0 ? "text-green-500" : "text-red-500"
                                )}>
                                    <span className="text-xs tracking-tight">
                 {totalChange >= 0 ? '+' : '-'}{Math.abs(totalChange).toFixed(2)}%
                                    </span>
                                    <span className="text-[10px] font-bold opacity-80 tabular-nums">
                                        ({totalChange >= 0 ? '+' : '-'}{formatFiat(Math.abs(changeAbsolute))})
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ⏱️ MICRO-TIMEFRAME REGISTRY (VERTICAL & COMPACT) */}
                <div className="flex flex-col gap-0.5 p-0.5 bg-white/[0.05] border border-white/15 rounded-lg shadow-xl w-10 shrink-0">
                  {['1H', '24H', '7D', '30D', '1Y'].map((dur) => (
                    <button 
                      key={dur} 
                      onClick={() => setSelectedTimeframe(dur as any)}
                      className={cn(
                        "py-0.5 rounded-md text-[7px] font-black tracking-tighter transition-all",
                        selectedTimeframe === dur ? "bg-primary text-black" : "text-white/40 hover:text-white"
                      )}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
            </div>

            {/* 🕹️ INSTITUTIONAL ULTRA-SLIM 5-NODE ACTION HUB */}
            <div className="px-4 mt-4 relative z-30">
              <div className="bg-[#0a0a0c]/60 border border-white/10 rounded-[2.5rem] p-1.5 flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl">
                  <ActionNode 
                    icon={Send} 
                    label="Send" 
                    isActive={activeActionId === 'send'}
                    onPress={() => setActiveActionId('send')}
                    onRelease={() => setActiveActionId(null)}
                    onClick={() => router.push('/send')} 
                  />
                  <ActionNode 
                    icon={HandCoins} 
                    label="Receive" 
                    isActive={activeActionId === 'receive'}
                    onPress={() => setActiveActionId('receive')}
                    onRelease={() => setActiveActionId(null)}
                    onClick={() => router.push('/receive')} 
                  />
                  <ActionNode 
                    icon={Handshake} 
                    label="Request" 
                    isActive={activeActionId === 'request' || isRequestOverlayOpen}
                    onPress={() => setActiveActionId('request')}
                    onRelease={() => setActiveActionId(null)}
                    onClick={() => {
                        setActiveActionId('request');
                        setIsRequestOverlayOpen(true);
                    }} 
                  />
                  <ActionNode 
                    icon={Repeat} 
                    label="Swap" 
                    isActive={activeActionId === 'swap' || isQuickSwapOpen}
                    onPress={() => setActiveActionId('swap')}
                    onRelease={() => setActiveActionId(null)}
                    onClick={() => {
                        setActiveActionId('swap');
                        setIsQuickSwapOpen(true);
                    }} 
                  />
                  <ActionNode 
                    icon={History} 
                    label="Logs" 
                    isActive={activeActionId === 'logs'}
                    onPress={() => setActiveActionId('logs')}
                    onRelease={() => setActiveActionId(null)}
                    onClick={() => router.push('/logs')} 
                  />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 📊 ASSET REGISTRY */}
      <main className="flex-1 overflow-y-auto overscroll-contain thin-scrollbar bg-black/20 mt-2">
        <Tabs defaultValue="tokens" className="w-full">
          
          <div className="sticky top-0 z-[105] px-3 pt-1 pb-3 space-y-2.5 bg-[#050505]/95 backdrop-blur-2xl shadow-2xl">
            <TabsList className="bg-[#111113] border border-white/15 rounded-2xl w-full grid grid-cols-3 h-11 p-1 gap-1 shadow-2xl">
              <TabsTrigger value="tokens" className="rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 data-[state=active]:text-primary data-[state=active]:bg-white/10">Tokens</TabsTrigger>
              <TabsTrigger value="defi" className="rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 data-[state=active]:text-primary data-[state=active]:bg-white/10">DeFi</TabsTrigger>
              <TabsTrigger value="nfts" className="rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 data-[state=active]:text-primary data-[state=active]:bg-white/10">NFTs</TabsTrigger>
            </TabsList>

            <div className="flex items-center justify-between px-1">
                <button 
                  onClick={() => setIsTokenManagerOpen(true)}
                  className="bg-[#111113] hover:bg-[#1a1a1c] px-4 h-9 rounded-xl border border-white/15 transition-all text-[10px] font-black uppercase text-white/80 flex items-center gap-2 shadow-xl"
                >
                  Manage <ChevronDown className="w-3.5 h-3.5 text-primary" />
                </button>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                    <Input 
                      placeholder="SEARCH REGISTRY" 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 bg-[#111113] border border-white/15 rounded-xl pl-9 pr-8 text-[9px] font-black placeholder:text-white/20 w-40 focus-visible:ring-0 shadow-inner text-white" 
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                        <button 
                          onClick={() => refresh()} 
                          className={cn("p-1.5 rounded-lg transition-all active:scale-90", isRefreshing ? "text-primary" : "text-white/40 hover:text-primary")}
                        >
                          {isRefreshing ? <IOSSpinner /> : <RefreshCw className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            </div>
          </div>

          <div className="px-3 pb-40">
            <TabsContent value="tokens" className="m-0 space-y-2 mt-4">
              {filteredAssets.map((token) => (
                token && <TokenRow key={`${token.chainId}-${token.address || token.symbol}`} token={token} isDisabled={isBalanceHidden} />
              ))}
              
              <AnimatePresence>
                {isInitialized && !isSynced && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 mb-2">
                    <section className="relative h-24 rounded-[2rem] bg-card border border-primary/30 overflow-hidden shadow-2xl flex items-center group">
                      <div className="absolute inset-0 z-0">
                         <img src="/icons/Upgradeicon.png" alt="Upgrade" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                         <div className="absolute inset-0 bg-gradient-to-r from-card via-card/70 to-transparent" />
                        </div>
                        <div className="relative z-10 pl-8 space-y-1">
                          <p className="text-xs font-black text-white uppercase tracking-tight">Security Handshake</p>
                          <p className="text-[9px] text-primary font-bold uppercase tracking-widest opacity-90 leading-tight">Sync encrypted vault to cloud<br/>for instant node recovery.</p>
                          <Button size="sm" className="h-8 px-5 rounded-lg bg-primary text-black font-black uppercase text-[8px] tracking-[0.2em] shadow-lg mt-2" onClick={() => router.push('/security/backup')}>Back Up Now</Button>
                        </div>
                      </section>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="defi" className="m-0 mt-4">
                <DeFiTab />
              </TabsContent>

              <TabsContent value="nfts" className="m-0 mt-4">
                <NftTab />
              </TabsContent>
          </div>
        </Tabs>
      </main>

      <TokenManager isOpen={isTokenManagerOpen} onOpenChange={setIsTokenManagerOpen} />
    </div>
  );
}
