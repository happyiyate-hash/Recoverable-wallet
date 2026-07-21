'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Send, 
  HandCoins, 
  Repeat, 
  History, 
  Search, 
  ChevronDown, 
  ChevronRight,
  EyeOff,
  Eye,
  Handshake,
  ArrowRight,
  Activity,
  ArrowUpRight,
  Zap,
  ShieldCheck,
  WalletCards,
  ArrowDownLeft
} from 'lucide-react';
import { useWallet } from '@/contexts/wallet-provider';
import { useUser } from '@/contexts/user-provider';
import { useCurrency } from '@/contexts/currency-provider';
import { useAppTheme } from '@/contexts/theme-provider';
import { cn } from '@/lib/utils';
import { motion, animate, AnimatePresence } from 'framer-motion';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { AssetRow } from '@/lib/types';

/**
 * INSTITUTIONAL INTEGRATED CHART (BACKGROUND NATIVE NODE)
 */
const DecorativeChart = ({ color }: { color: string }) => {
  return (
    <div className="w-full h-full relative opacity-30">
      <svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id="line-gradient-desktop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path 
          d="M0,80 Q30,20 60,70 T120,40 T180,90 T240,30 T300,70 T400,45" 
          fill="none" 
          stroke={color} 
          strokeWidth="3" 
          strokeLinecap="round"
        />
        <path 
          d="M0,80 Q30,20 60,70 T120,40 T180,90 T240,30 T300,70 T400,45 V100 H0 Z" 
          fill="url(#line-gradient-desktop)"
        />
      </svg>
    </div>
  );
};

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

export default function DesktopWalletTab({ computedAssets }: { computedAssets: AssetRow[] }) {
  const { 
    setIsRequestOverlayOpen, 
    setIsQuickSwapOpen,
    wallets
  } = useWallet();
  const { isBalanceHidden } = useUser();
  const { formatFiat } = useCurrency();
  const { activeTheme } = useAppTheme();
  const [activeTab, setActiveTab] = useState('tokens');
  const [search, setSearch] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1H' | '24H' | '7D' | '30D' | '1Y'>('24H');
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const router = useRouter();

  const totalFiatValue = useMemo(() => {
    return computedAssets.reduce((sum, asset) => sum + (asset?.fiatValueUsd ?? 0), 0);
  }, [computedAssets]);

  const { totalChange, changeAbsolute } = useMemo(() => {
    const currentTotalUsd = totalFiatValue;
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
    const deltaAbsoluteUsd = Math.abs(currentTotalUsd - yesterdayTotalUsd);
    return { totalChange: deltaPercent, changeAbsolute: deltaAbsoluteUsd };
  }, [computedAssets, totalFiatValue, selectedTimeframe]);

  const filteredAssets = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return computedAssets;
    return computedAssets.filter(a => 
      a.symbol.toLowerCase().includes(term) || 
      a.name.toLowerCase().includes(term)
    );
  }, [computedAssets, search]);

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in duration-500">
      
      {/* 💳 INSTITUTIONAL DESKTOP VALUATION HUB */}
      <div className="flex items-center gap-6 shrink-0">
          <section className="flex-1 h-36 rounded-[3.5rem] bg-[#0F0F11] border-2 border-primary/25 shadow-[0_15px_50px_rgba(0,0,0,0.6)] backdrop-blur-3xl relative overflow-hidden flex items-center justify-between px-10">
             <div className="absolute inset-0 z-0 pointer-events-none -top-12">
                <DecorativeChart color={activeTheme.hex} />
             </div>

             <div className="relative z-10">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary mb-2.5 flex items-center gap-2.5">
                   <WalletCards className="w-5" /> Comprehensive Net Worth
                </p>
                {isBalanceHidden ? (
                    <h1 className="text-6xl font-black text-white/10 tracking-tighter">••••••••••••</h1>
                ) : (
                    <h1 className="text-5xl font-black text-white tracking-tighter tabular-nums drop-shadow-2xl">
                        <AnimatedNumber value={totalFiatValue} />
                    </h1>
                )}
             </div>

             <div className="flex flex-col gap-3 items-end relative z-10">
                {!isBalanceHidden && (
                    <div className={cn(
                        "px-5 py-2 rounded-xl border-2 font-black text-sm uppercase tracking-widest shadow-2xl flex items-center gap-2.5 transition-colors duration-500",
                        totalChange >= 0 ? "bg-green-500/15 border-green-500/30 text-green-400" : "bg-red-500/15 border-red-500/30 text-red-400"
                    )}>
                       <span>{totalChange >= 0 ? '▲' : '▼'} {Math.abs(totalChange).toFixed(2)}%</span>
                    </div>
                )}
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                   {wallets?.length || 0} SECURE NODES ACTIVE
                </p>
             </div>
          </section>

          <div className="flex flex-col gap-1.5 p-1.5 bg-[#0F0F11] border border-white/15 rounded-[1.8rem] shadow-2xl h-36 justify-center w-20">
                {['1H', '24H', '7D', '30D', '1Y'].map((dur) => (
                    <button 
                        key={dur} 
                        onClick={() => setSelectedTimeframe(dur as any)}
                        className={cn(
                        "flex-1 rounded-xl text-[9px] font-black tracking-widest transition-all uppercase",
                        selectedTimeframe === dur ? "bg-primary text-black shadow-xl" : "text-white/40 hover:text-white hover:bg-white/5"
                    )}>{dur}</button>
                ))}
          </div>
      </div>

      {/* 🕹️ DESKTOP ACTION HUB */}
      <div className="grid grid-cols-4 gap-6 w-full h-36 shrink-0">
         <DesktopActionCard 
            id="send"
            icon={<ArrowUpRight className="w-7 h-7" />} 
            label="Send" 
            desc="Authorize Dispatch" 
            isActive={activeActionId === 'send'}
            onPress={() => setActiveActionId('send')}
            onRelease={() => setActiveActionId(null)}
            onClick={() => router.push('/send')}
            color="primary"
         />
         <DesktopActionCard 
            id="receive"
            icon={<ArrowDownLeft className="w-7 h-7" />} 
            label="Receive" 
            desc="Obtain Asset Node" 
            isActive={activeActionId === 'receive'}
            onPress={() => setActiveActionId('receive')}
            onRelease={() => setActiveActionId(null)}
            onClick={() => router.push('/receive')}
            color="emerald"
         />
         <DesktopActionCard 
            id="swap"
            icon={<Repeat className="w-7 h-7" />} 
            label="Swap" 
            desc="Liquidity Handshake" 
            isActive={activeActionId === 'swap'}
            onPress={() => setActiveActionId('swap')}
            onRelease={() => setActiveActionId(null)}
            onClick={() => setIsQuickSwapOpen(true)}
            color="primary"
         />
         <DesktopActionCard 
            id="logs"
            icon={<History className="w-7 h-7" />} 
            label="Registry" 
            desc="Forensic History" 
            isActive={activeActionId === 'logs'}
            onPress={() => setActiveActionId('logs')}
            onRelease={() => setActiveActionId(null)}
            onClick={() => router.push('/logs')}
            color="zinc"
         />
      </div>

      {/* 📊 ASSET REGISTRY TABLE */}
      <section className="bg-card border border-white/10 rounded-[3.5rem] flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.02)]">
        <div className="px-12 py-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex p-1.5 bg-black/60 rounded-2xl border border-white/15 h-12">
              <TabTrigger active={activeTab === 'tokens'} onClick={() => setActiveTab('tokens')}>Assets</TabTrigger>
              <TabTrigger active={activeTab === 'defi'} onClick={() => setActiveTab('defi')}>Yield</TabTrigger>
              <TabTrigger active={activeTab === 'nfts'} onClick={() => setActiveTab('nfts')}>Digital</TabTrigger>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30" strokeWidth={2.5} />
                    <Input 
                      placeholder="SEARCH NODES" 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-12 bg-black/40 border border-white/15 rounded-2xl pl-12 pr-12 text-[11px] font-black uppercase tracking-[0.2em] placeholder:text-white/10 w-72 focus-visible:ring-primary shadow-inner text-white transition-all" 
                    />
                </div>
            </div>
        </div>

        <div className="overflow-x-auto thin-scrollbar">
            <table className="w-full text-left">
                <thead className="bg-white/[0.01] border-b border-white/10">
                    <tr className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">
                        <th className="px-14 py-6">Registry Asset</th>
                        <th className="px-8 py-6 text-right">Balance</th>
                        <th className="px-8 py-6 text-right">Price</th>
                        <th className="px-8 py-6 text-right">24h Delta</th>
                        <th className="px-14 py-6 text-right">Valuation</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                    {filteredAssets.map((asset, i) => (
                        <AssetRowNode key={i} asset={asset} formatFiat={formatFiat} isHidden={isBalanceHidden} onClick={() => router.push(`/token-details?symbol=${asset.symbol}&chainId=${asset.chainId}`)} />
                    ))}
                </tbody>
            </table>
        </div>
      </section>
    </div>
  );
}

function DesktopActionCard({ icon, label, desc, onClick, color, isActive, onPress, onRelease }: any) {
    const isEmerald = color === 'emerald';
    return (
        <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            onPointerDown={onPress}
            onPointerUp={onRelease}
            onPointerCancel={onRelease}
            className={cn(
                "flex-1 rounded-[3.5rem] bg-card border-2 transition-all duration-300 group overflow-hidden relative shadow-2xl outline-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]",
                isActive 
                  ? (isEmerald ? "border-emerald-500/60 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.15)]" : "border-primary/60 bg-primary/5 shadow-[0_0_40px_rgba(var(--primary),0.15)]") 
                  : "border-white/5 hover:border-white/20"
            )}
        >
            <div className={cn(
                "absolute -right-6 -top-6 w-28 h-28 rounded-full blur-[25px] transition-all duration-500",
                isActive ? (isEmerald ? "bg-emerald-500/20" : "bg-primary/20") : "bg-transparent"
            )} />
            <div className="p-7 h-full flex flex-col justify-between relative z-10">
                <div className={cn(
                    "w-12 h-12 rounded-2xl bg-black border-2 transition-all duration-300 flex items-center justify-center shadow-xl",
                    isActive 
                        ? (isEmerald ? "border-emerald-500/60 text-emerald-400 scale-110" : "border-primary/60 text-primary scale-110") 
                        : "border-white/10 text-white/40 group-hover:text-white"
                )}>
                    {icon}
                </div>
                <div>
                    <p className={cn(
                        "text-xl font-black uppercase tracking-widest leading-none mb-2 transition-colors duration-300",
                        isActive ? "text-white" : "text-white/40 group-hover:text-white"
                    )}>{label}</p>
                    <p className={cn(
                        "text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-300",
                        isActive ? (isEmerald ? "text-emerald-500" : "text-primary") : "text-white/20 group-hover:text-white/40"
                    )}>{desc}</p>
                </div>
            </div>
        </motion.div>
    );
}

function TabTrigger({ children, active, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "rounded-xl px-12 h-full text-[11px] font-black uppercase tracking-widest transition-all duration-200",
                active ? "bg-primary/20 text-primary border border-primary/30" : "text-white/40 hover:text-white/70"
            )}
        >
            {children}
        </button>
    );
}

function AssetRowNode({ asset, formatFiat, onClick, isHidden }: any) {
  const isPositive = (asset.pctChange24h || 0) >= 0;
  return (
    <tr onClick={onClick} className="hover:bg-white/[0.025] transition-all duration-200 cursor-pointer group h-24">
        <td className="px-14 py-5">
            <div className="flex items-center gap-7">
                <div className="w-14 h-14 rounded-2xl bg-black border-2 border-white/10 p-2.5 shadow-2xl group-hover:scale-110 transition-transform">
                    <TokenLogoDynamic logoUrl={asset.iconUrl} size={32} symbol={asset.symbol} chainId={asset.chainId} />
                </div>
                <div>
                    <p className="text-[16px] font-black uppercase text-white tracking-tight leading-none">{asset.symbol}</p>
                    <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mt-2.5">{asset.name}</p>
                </div>
            </div>
        </td>
        <td className="px-8 py-5 text-right">
            <p className="text-[16px] font-black text-white tabular-nums tracking-tight">
                {isHidden ? '••••••••' : parseFloat(asset.balance).toLocaleString()}
            </p>
        </td>
        <td className="px-8 py-5 text-right">
            <p className="text-[16px] font-bold text-white/70 tabular-nums tracking-tight">${asset.priceUsd?.toLocaleString() || '0.00'}</p>
        </td>
        <td className="px-8 py-5 text-right">
            <span className={cn(
                "text-[12px] font-black px-4 py-1.5 rounded-xl border shadow-inner", 
                isPositive ? "text-green-500 bg-green-500/10 border-green-500/20" : "text-red-500 bg-red-500/10 border-red-500/20"
            )}>
                {isPositive ? '▲' : '▼'} {Math.abs(asset.pctChange24h || 0).toFixed(2)}%
            </span>
        </td>
        <td className="px-14 py-5 text-right">
            <div className="flex items-center justify-end gap-7">
                <p className="text-[16px] font-black text-white tabular-nums tracking-tighter">
                    {isHidden ? '••••••••' : formatFiat(asset.fiatValueUsd || 0)}
                </p>
                <ChevronRight className="w-6 h-6 text-white/10 group-hover:text-primary transition-all duration-200 group-hover:translate-x-2" strokeWidth={3} />
            </div>
        </td>
    </tr>
  );
}
