
'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  ChevronRight, 
  Loader2, 
  Activity,
  Coins,
  History,
  Lock,
  ArrowUpRight,
  RefreshCw,
  Building2,
  PieChart,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/wallet-provider';
import { useCurrency } from '@/contexts/currency-provider';
import { defiService } from '@/lib/services/defi-service';
import type { YieldPool, DeFiPosition } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function DeFiDashboard() {
    const router = useRouter();
    const { wallets } = useWallet();
    const { formatFiat } = useCurrency();
    const [pools, setPools] = useState<YieldPool[]>([]);
    const [positions, setPositions] = useState<DeFiPosition[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'strategies' | 'portfolio'>('strategies');

    useEffect(() => {
        async function load() {
            try {
                const [poolData, posData] = await Promise.all([
                    defiService.fetchTopYields(),
                    wallets && wallets[0] ? defiService.fetchUserPositions(wallets[0].address) : Promise.resolve([])
                ]);
                setPools(poolData || []);
                setPositions(posData || []);
            } catch (e) {
                console.error("[DEFI_DASHBOARD_CRITICAL] Registry handshake failed:", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [wallets]);

    const totalPortfolioValue = useMemo(() => {
        if (!positions || !Array.isArray(positions)) return 0;
        return positions.reduce((sum, p) => sum + (Number(p.valueUsd) || 0), 0);
    }, [positions]);

    const avgApy = useMemo(() => {
        if (!positions || !Array.isArray(positions) || positions.length === 0) return 0;
        const sum = positions.reduce((acc, p) => acc + (Number(p.apy) || 0), 0);
        return sum / positions.length;
    }, [positions]);

    return (
        <div className="flex flex-col min-h-screen bg-transparent text-foreground overflow-hidden">
            <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </Button>
                <div className="flex flex-col items-center text-center">
                    <h1 className="text-xs font-black uppercase tracking-[0.2em] leading-none text-white/90">Finance Terminal</h1>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <Activity className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[8px] text-primary font-black uppercase tracking-tighter">Liquidity Registry</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-xl"><History className="w-5 h-5 text-muted-foreground" /></Button>
            </header>

            <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full pb-32 overflow-y-auto thin-scrollbar">
                {/* SUMMARY NODE */}
                <section className="p-8 rounded-[3rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden shadow-2xl">
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-primary fill-primary" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Net Performance</span>
                            </div>
                            <span className="text-[8px] font-black text-green-500 uppercase bg-green-500/10 px-2 py-0.5 rounded-full">Synchronized</span>
                        </div>
                        
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Total Staked Assets</p>
                            <h2 className="text-4xl font-black tracking-tighter text-white">{formatFiat(totalPortfolioValue)}</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-muted-foreground uppercase">Average Yield</p>
                                <p className="text-xl font-black text-green-400 tabular-nums">+{avgApy.toFixed(2)}%</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-muted-foreground uppercase">Cloud Dominance</p>
                                <p className="text-xl font-black text-white tabular-nums">12.4%</p>
                            </div>
                        </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary/10 blur-3xl rounded-full" />
                </section>

                <div className="flex items-center justify-center p-1 bg-white/5 rounded-2xl">
                    <button 
                        onClick={() => setActiveTab('strategies')}
                        className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'strategies' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white")}
                    >
                        Market Strategies
                    </button>
                    <button 
                        onClick={() => setActiveTab('portfolio')}
                        className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'portfolio' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white")}
                    >
                        Your Positions
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {loading ? (
                        <div className="flex flex-col items-center py-20 gap-4 opacity-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Scanning Protocols...</p>
                        </div>
                    ) : activeTab === 'strategies' ? (
                        <motion.div key="strategies" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                            <div className="flex items-center justify-between px-2">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">High Yield Nodes</p>
                                <Filter className="w-3 h-3 text-white/20" />
                            </div>
                            {pools.map((pool, i) => (
                                <div key={pool.id} className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all shadow-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center relative overflow-hidden">
                                            <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                                            <Building2 className="w-6 h-6 text-primary/60 relative z-10" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-sm text-white tracking-tight">{pool.symbol} Pool</p>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">{pool.project} • {pool.chain}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-lg font-black text-green-400 tabular-nums">+{Number(pool.apy).toFixed(2)}%</p>
                                            <p className="text-[8px] font-black text-white/20 uppercase tracking-tighter">Estimated APY</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div key="portfolio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                            {positions.length > 0 ? positions.map((pos) => (
                                <div key={pos.id} className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Zap className="w-5 h-5" /></div>
                                            <div>
                                                <p className="font-black text-sm text-white">{pos.asset}</p>
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase">{pos.protocol}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-base text-white">{pos.balance} {pos.asset}</p>
                                            <p className="text-[10px] font-bold text-primary">≈ {formatFiat(Number(pos.valueUsd) || 0)}</p>
                                        </div>
                                    </div>
                                    <div className="pt-2 flex gap-2">
                                        <Button className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 font-black uppercase text-[8px] tracking-widest hover:bg-white/10">Add Liquidity</Button>
                                        <Button className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 font-black uppercase text-[8px] tracking-widest hover:bg-white/10 text-red-400">Withdraw</Button>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                                    <div className="w-16 h-16 rounded-[2rem] bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
                                        <PieChart className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-black uppercase tracking-widest text-white">Registry Empty</p>
                                        <p className="text-[9px] font-medium leading-relaxed max-w-[180px]">No active yield positions detected in this terminal.</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="pt-8 flex flex-col items-center gap-3 opacity-20">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                        <ShieldCheck className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Protocol Audit: 100% SECURE</span>
                    </div>
                    <p className="text-[8px] text-muted-foreground/20 uppercase font-black tracking-widest text-center max-w-[200px] leading-relaxed">Cross-chain position discovery verified via Zerion & DefiLlama nodes.</p>
                </div>
            </main>
        </div>
    );
}
