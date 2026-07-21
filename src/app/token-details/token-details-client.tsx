'use client';

import React, { useState, useMemo, useEffect, useRef } from "react";
import type { AssetRow } from "@/lib/types";
import { useWallet } from "@/contexts/wallet-provider";
import { useUser } from "@/contexts/user-provider";
import { useCurrency } from "@/contexts/currency-provider";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    Info,
    Loader2,
    Repeat,
    BarChart3,
    Activity,
    TrendingUp,
    MessageSquare,
    ChevronRight,
    ShieldCheck,
    X,
    DoorOpen,
    DollarSign,
    QrCode,
    ArrowUpRight,
    ChevronLeft as ChevronLeftIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MarketStats from "./market-stats";
import { useSingleTokenDetails } from "@/hooks/useTokenDetails";
import RechartsChart from "@/components/RechartsChart";
import { cn } from "@/lib/utils";
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import TransactionHistory from "./transaction-history";
import { getInitialAssets } from "@/lib/wallets/balances";
import { fetchSingleTokenDetails } from "@/lib/coingecko";
import CandleChart from "@/components/CandleChart";
import { tronAdapterFactory } from "@/lib/wallets/adapters/tron";
import { xrpAdapterFactory } from "@/lib/wallets/adapters/xrp";
import { evmAdapterFactory } from "@/lib/wallets/adapters/evm";
import { solanaAdapterFactory } from "@/lib/wallets/adapters/solana";
import { bitcoinAdapterFactory } from "@/lib/wallets/adapters/bitcoin";
import { motion, AnimatePresence } from 'framer-motion';

const LiveChat = () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 p-6 bg-white/[0.01]">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
        </div>
        <div className="text-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white mb-0.5">Live Chat</h3>
            <p className="text-[8px] uppercase tracking-widest opacity-30">Node handshake in progress.</p>
        </div>
    </div>
);

const TokenDetailHeader = ({
    onBack,
    onInfo,
    token,
    network
}: {
    onBack: () => void
    onInfo: () => void
    token: AssetRow
    network: any
}) => (
    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-[150] px-6">
        <Button onClick={onBack} variant="ghost" size="icon" className="rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
                <TokenLogoDynamic
                    logoUrl={token.iconUrl}
                    alt={token.name}
                    size={22}
                    chainId={token.chainId}
                    name={token.name}
                    symbol={token.symbol}
                />
                <span className="font-black text-sm uppercase tracking-tight text-white">{token.symbol}</span>
            </div>
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black opacity-40">{token.symbol === 'WNC' ? 'Internal Registry' : network?.name}</span>
        </div>
        <Button onClick={onInfo} variant="ghost" size="icon" className="rounded-xl hover:bg-primary/20 text-primary">
            <Info className="w-5 h-5" />
        </Button>
    </div>
);

export default function TokenDetailsClientPage() {
    const { isInitialized, balances, prices, viewingNetwork, allChainsMap, userAddedTokens, wallets, getAddressForChain, infuraApiKey, alchemyApiKey } = useWallet();
    const { profile } = useUser();
    const { currentSymbol, convertFromUsd, formatFiat, selectedCurrency } = useCurrency();
    const router = useRouter();
    const searchParams = useSearchParams();

    const tokenSymbol = searchParams.get('symbol');
    const chainIdStr = searchParams.get('chainId');

    const [chartRange, setChartRange] = useState<"1H" | "24H" | "7D" | "1M" | "3M" | "YTD" | "1Y" | "MAX">("24H");
    const [chartType, setChartType] = useState<"line" | "candle">("line");
    const [viewMode, setViewMode] = useState<"chart" | "chat">("chart");

    const [livePriceUsd, setLivePriceUsd] = useState<number>(0);
    const [liveChange, setLiveChange] = useState<number>(0);
    const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [securityRisk, setSecurityRisk] = useState<{
        isRisk: boolean;
        reason: string;
        type: 'tron' | 'xrp' | 'evm' | 'solana' | 'btc' | null;
        dismissed: boolean;
    } | null>(null);

    const initialToken = useMemo(() => {
        if (!tokenSymbol || !isInitialized) return null;
        const targetChainId = chainIdStr ? parseInt(chainIdStr) : viewingNetwork.chainId;

        if (tokenSymbol === 'WNC') {
            const price = prices['internal:wnc']?.price || 0.0006;
            const balance = profile?.wnc_earnings || 0;
            return {
                symbol: 'WNC',
                name: 'Wevinacoin',
                balance: balance.toString(),
                priceUsd: price,
                fiatValueUsd: balance * price,
                pctChange24h: prices['internal:wnc']?.change || 0,
                chainId: targetChainId,
                address: 'internal:wnc',
                iconUrl: '/icons/iconwnc.png',
                coingeckoId: 'internal:wnc'
            } as AssetRow;
        }

        const baseAssets = getInitialAssets(targetChainId);
        const customAssets = userAddedTokens.filter(t => t.chainId === targetChainId);
        const fullRegistry = [...baseAssets, ...customAssets];

        const skeleton = fullRegistry.find(a => a.symbol === tokenSymbol);
        if (!skeleton) return null;

        const chainBalances = balances[targetChainId] || [];
        const balDoc = chainBalances.find(b =>
            skeleton.isNative ? b.symbol === skeleton.symbol : b.address?.toLowerCase() === skeleton.address?.toLowerCase()
        );

        const priceId = (skeleton.priceId || skeleton.coingeckoId || skeleton.address || '').toLowerCase();
        const marketData = prices[priceId];
        const balNum = parseFloat(balDoc?.balance || '0');

        return {
            ...skeleton,
            balance: balDoc?.balance || '0',
            priceUsd: marketData?.price || 0,
            fiatValueUsd: balNum * (marketData?.price || 0),
            pctChange24h: marketData?.change || 0
        } as AssetRow;
    }, [tokenSymbol, chainIdStr, isInitialized, balances, prices, profile, userAddedTokens, viewingNetwork.chainId]);

    useEffect(() => {
        const runAudit = async () => {
            if (!initialToken || !wallets || !isInitialized) return;

            const chain = allChainsMap[initialToken.chainId] || viewingNetwork;
            const address = getAddressForChain(chain, wallets);
            if (!address) return;

            try {
                if (initialToken.chainId === 728126428) {
                    const adapter = tronAdapterFactory(chain);
                    if (adapter) {
                        const audit = await (adapter as any).checkAccountSecurity(address);
                        if (audit.isRisk) {
                            setSecurityRisk({ isRisk: true, reason: "Permission Trap detected.", type: 'tron', dismissed: false });
                            return;
                        }
                    }
                }

                if (initialToken.chainId === 144) {
                    const adapter = xrpAdapterFactory(chain);
                    if (adapter) {
                        const audit = await (adapter as any).checkAccountSecurity(address);
                        if (audit.isRisk) {
                            setSecurityRisk({ isRisk: true, reason: "Restricted Signing Node.", type: 'xrp', dismissed: false });
                            return;
                        }
                    }
                }

                if ([1, 137, 8453].includes(initialToken.chainId)) {
                    const adapter = evmAdapterFactory(chain, infuraApiKey, alchemyApiKey);
                    if (adapter) {
                        const audit = await (adapter as any).checkAccountSecurity(address);
                        if (audit && audit.unlimitedApprovals > 0) {
                            setSecurityRisk({ isRisk: true, reason: "High Risk Approvals.", type: 'evm', dismissed: false });
                            return;
                        }
                    }
                }

                if (initialToken.chainId === 501) {
                    const adapter = solanaAdapterFactory(chain);
                    if (adapter) {
                        const audit = await (adapter as any).checkAccountSecurity(address, initialToken.address);
                        if (audit?.freezeAuthority || (audit?.delegations && audit.delegations > 0)) {
                            setSecurityRisk({ isRisk: true, reason: "Active Authority Lock.", type: 'solana', dismissed: false });
                            return;
                        }
                    }
                }

                setSecurityRisk(null);
            } catch (e) {
                console.warn("[SENTINEL_ADVISORY] Audit deferred.");
            }
        };
        runAudit();
    }, [initialToken, wallets, isInitialized, allChainsMap, viewingNetwork, infuraApiKey, alchemyApiKey, getAddressForChain]);

    const coingeckoId = initialToken?.coingeckoId;
    const { data: marketStats } = useSingleTokenDetails(coingeckoId, initialToken?.chainId, initialToken?.address);
    useEffect(() => {
        if (!coingeckoId || initialToken?.symbol === 'WNC') return;

        const executeUpdate = async () => {
            if (document.hidden) return;
            try {
                const data = await fetchSingleTokenDetails(coingeckoId);
                if (data?.market_data) {
                    setLivePriceUsd(data.market_data.current_price.usd);
                    setLiveChange(data.market_data.price_change_percentage_24h);
                }
            } catch (e) {
                console.warn("[LIVE_UPDATE_ADVISORY] Handshake deferred.");
            }
        };

        executeUpdate();
        updateIntervalRef.current = setInterval(executeUpdate, 15000);
        return () => { if (updateIntervalRef.current) clearInterval(updateIntervalRef.current); };
    }, [coingeckoId, initialToken?.symbol]);

    useEffect(() => {
        if (initialToken && livePriceUsd === 0) {
            setLivePriceUsd(initialToken.priceUsd || 0);
            setLiveChange(initialToken.pctChange24h || 0);
        }
    }, [initialToken, livePriceUsd]);

    if (!isInitialized) return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-[#050505] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Synchronizing...</p>
        </div>
    );

    if (!initialToken) return null;

    const activeChain = allChainsMap[initialToken.chainId] || viewingNetwork;
    const displayPrice = livePriceUsd > 0 ? livePriceUsd : initialToken.priceUsd || 0;
    const displayChange = liveChange !== 0 ? liveChange : initialToken.pctChange24h || 0;
    const performanceMetrics = [
        { label: '1H', value: marketStats?.market_data?.price_change_percentage_1h_in_currency?.usd || 0, range: '1H' as const },
        { label: '24H', value: liveChange || marketStats?.market_data?.price_change_percentage_24h || 0, range: '24H' as const },
        { label: '7D', value: marketStats?.market_data?.price_change_percentage_7d || 0, range: '7D' as const },
        { label: '1M', value: marketStats?.market_data?.price_change_percentage_30d || 0, range: '1M' as const },
        { label: '1Y', value: marketStats?.market_data?.price_change_percentage_1y || 0, range: '1Y' as const }
    ];

    const activeMetric = performanceMetrics.find(m => m.range === chartRange);
    const activeIsNegative = (activeMetric?.value || 0) < 0;

    const formatLivePrice = (val: number) => {
        const converted = convertFromUsd(val);
        return `${currentSymbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    };

    const navParams = `symbol=${initialToken.symbol}&chainId=${initialToken.chainId}`;

    const handleNavigateToDetails = () => {
        if (!securityRisk) return;
        const route = securityRisk.type === 'tron' ? 'tron-permissions' :
            securityRisk.type === 'xrp' ? 'xrp-permissions' :
                `${securityRisk.type}-security`;
        router.push(`/security/${route}`);
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-white">
            <TokenDetailHeader
                onBack={() => router.back()}
                onInfo={() => router.push(`/tokens/info?${navParams}`)}
                token={initialToken}
                network={activeChain}
            />

            <div className="flex-1 overflow-y-auto thin-scrollbar pb-40">
                <AnimatePresence>
                    {securityRisk && !securityRisk.dismissed && (
                        <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-6 pt-4">
                            <div className="w-full bg-[#0a0a0c] border border-red-500/20 rounded-xl p-3.5 flex items-center justify-between shadow-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500"><ShieldCheck className="w-4 h-4" /></div>
                                    <p className="text-[10px] font-black uppercase text-white tracking-tight">{securityRisk.reason}</p>
                                </div>
                                <button onClick={() => setSecurityRisk(prev => prev ? { ...prev, dismissed: true } : null)} className="p-1 text-white/20 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <section className="px-6 pt-10 pb-4 text-left">
                    <h2 className="text-3xl font-black tracking-tight text-white leading-none mb-1">{formatLivePrice(displayPrice)}</h2>
                    <div className={cn("inline-flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest", activeIsNegative ? "text-red-500" : "text-green-500")}>
                        <span>{activeIsNegative ? "▼" : "▲"} {Math.abs(displayChange || 0).toFixed(2)}%</span>
                        <span className="opacity-40">({chartRange})</span>
                    </div>
                </section>

                <div className="px-4 flex items-center justify-between h-8 mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Live Pulse</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5 backdrop-blur-xl">
                        <Button variant="ghost" size="icon" onClick={() => setViewMode('chart')} className={cn("w-7 h-7 rounded-lg transition-all", viewMode === 'chart' ? "bg-primary text-black" : "text-white/40")}>
                            <TrendingUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setViewMode('chat')} className={cn("w-7 h-7 rounded-lg transition-all", viewMode === 'chat' ? "bg-primary text-black" : "text-white/40")}>
                            <MessageSquare className="w-3.5 h-3.5" />
                        </Button><div className="w-px h-3 bg-white/10 mx-0.5" />
                        <Button variant="ghost" size="icon" onClick={() => setChartType(chartType === 'line' ? 'candle' : 'line')} className="w-7 h-7 rounded-lg bg-white/5 text-primary hover:bg-white/10">
                            {chartType === 'line' ? <BarChart3 className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                        </Button>
                    </div>
                </div>

                <div className="relative w-full overflow-hidden bg-[#0a0a0c]">
                    <div className="h-[220px] w-full relative">
                        <div className={cn("w-full h-full", (viewMode === 'chart' && chartType === 'line') ? 'block' : 'hidden')}>
                            <RechartsChart coingeckoId={coingeckoId} days={chartRange} isNegative={activeIsNegative} chainId={initialToken.chainId} contractAddress={initialToken.address} currentPrice={displayPrice} />
                        </div>
                        <div className={cn("w-full h-full", (viewMode === 'chart' && chartType === 'candle') ? 'block' : 'hidden')}>
                            <CandleChart coingeckoId={coingeckoId} chainId={initialToken.chainId} contractAddress={initialToken.address} days={chartRange} currentPrice={displayPrice} />
                        </div>
                        <div className={cn("w-full h-full", viewMode === 'chat' ? 'block' : 'hidden')}>
                            <LiveChat />
                        </div>
                    </div>
                </div>

                <section className="px-0 py-0.5 border-y border-white/5 overflow-x-auto bg-white/[0.01]">
                    <div className="flex items-center min-w-full">
                        {performanceMetrics.map((m) => {
                            const isSelected = chartRange === m.range;
                            const val = Number(m.value);
                            return (
                                <button
                                    key={m.label}
                                    onClick={() => setChartRange(m.range)}
                                    className={cn(
                                        "flex-1 min-w-[80px] flex flex-col items-center py-2 transition-all",
                                        isSelected ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"
                                    )}
                                >
                                    <span className={cn("text-[8px] font-black uppercase tracking-widest mb-0.5", isSelected ? "text-primary" : "text-muted-foreground")}>{m.label}</span>
                                    <span className={cn("text-[9px] font-black tabular-nums", val === 0 ? "text-white/20" : val < 0 ? "text-red-500" : "text-green-500")}>
                                        {val === 0 ? "0.0%" : (val < 0 ? "▼" : "▲") + " " + Math.abs(val).toFixed(1) + "%"}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <div className="px-6 space-y-10 mt-10">
                    <MarketStats stats={marketStats} tokenSymbol={initialToken.symbol} />
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Registry Activity</h3>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <TransactionHistory token={initialToken} />
                    </div>
                </div>
            </div>

            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0c]/80 backdrop-blur-3xl border-t border-white/5 z-[200]">
                <div className="max-w-lg mx-auto flex gap-3">
                    <ActionNode label="Buy" icon={DollarSign} onClick={() => router.push(`/buy?${navParams}`)} />
                    <ActionNode label="Swap" icon={Repeat} onClick={() => router.push(`/swap?${navParams}`)} />
                    <ActionNode label="Send" icon={ArrowUpRight} onClick={() => router.push(`/send?${navParams}`)} />
                    <ActionNode label="Receive" icon={QrCode} onClick={() => router.push(`/receive?${navParams}`)} />
                </div>
            </footer>
        </div>
    );
}

function ActionNode({ label, icon: Icon, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="flex-1 h-12 flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-black shadow-lg shadow-primary/10 active:scale-95 transition-all group"
        >
            <Icon className="w-4 h-4 mb-0.5" />
            <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
        </button>
    );
}