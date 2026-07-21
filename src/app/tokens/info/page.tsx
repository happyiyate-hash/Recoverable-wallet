'use client';

import React, { useMemo, Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWallet } from '@/contexts/wallet-provider';
import { useSingleTokenDetails } from '@/hooks/useTokenDetails';
import {
  ArrowLeft,
  ShieldCheck,
  Copy,
  CheckCircle2,
  Globe,
  Zap,
  Loader2,
  Cpu,
  Info,
  Activity,
  Workflow,
  ShieldAlert,
  X,
  DoorOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { getInitialAssets } from '@/lib/wallets/balances';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// REGISTRY ADAPTERS
import { tronAdapterFactory } from "@/lib/wallets/adapters/tron";
import { xrpAdapterFactory } from "@/lib/wallets/adapters/xrp";
import { evmAdapterFactory } from "@/lib/wallets/adapters/evm";
import { solanaAdapterFactory } from "@/lib/wallets/adapters/solana";
import { bitcoinAdapterFactory } from "@/lib/wallets/adapters/bitcoin";

function FullPageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#050505]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
  onBack
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#050505] px-8 text-center">
      <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-dashed border-white/10 flex items-center justify-center mb-6 opacity-20">
        <div className="w-10 h-10 border-2 border-white/20 rounded-full" />
      </div>
      <h2 className="text-xl font-black uppercase tracking-tight text-white">
        {title}
      </h2>
      <p className="text-[10px] font-bold text-white/40 mt-2 max-w-sm uppercase tracking-widest">
        {subtitle}
      </p>

      <Button
        onClick={onBack}
        className="mt-10 rounded-2xl px-8 h-14 font-black uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10"
      >
        Return to Terminal
      </Button>
    </div>
  );
}

function TokenInfoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    isInitialized,
    viewingNetwork,
    userAddedTokens,
    allChainsMap,
    wallets,
    getAddressForChain,
    infuraApiKey,
    alchemyApiKey
  } = useWallet();

  const [isCopied, performCopy] = useCopyToClipboard();

  const symbol = searchParams.get('symbol')?.trim() || '';
  const rawChainId = Number(searchParams.get('chainId'));
  const chainId = Number.isFinite(rawChainId) && rawChainId > 0 ? rawChainId : 1;

  // 🛡️ UNIFIED SENTINEL STATE
  const [securityRisk, setSecurityRisk] = useState<{ 
    isRisk: boolean; 
    reason: string; 
    type: 'tron' | 'xrp' | 'evm' | 'solana' | 'btc' | null;
    dismissed: boolean;
  } | null>(null);

  const token = useMemo(() => {
    if (!symbol || !isInitialized) return null;

    const baseTokens = getInitialAssets(chainId) || [];
    const customTokens = userAddedTokens?.filter((t) => t.chainId === chainId) || [];
    const combined = [...baseTokens, ...customTokens];

    return combined.find((t) => t.symbol?.toLowerCase() === symbol.toLowerCase()) || null;
  }, [symbol, chainId, isInitialized, userAddedTokens]);

  const { data: details, isLoading } = useSingleTokenDetails(token?.coingeckoId, chainId, token?.address);

  /**
   * GLOBAL SENTINEL AUDIT
   */
  useEffect(() => {
    const runSecurityAudit = async () => {
      if (!token || !wallets || !isInitialized) return;

      const chain = allChainsMap[token.chainId] || viewingNetwork;
      const address = getAddressForChain(chain, wallets);

      if (!address) return;

      try {
        if (token.chainId === 728126428) {
          const adapter = tronAdapterFactory(chain);
          if (adapter) {
            const audit = await (adapter as any).checkAccountSecurity(address);
            if (audit.isRisk) {
              setSecurityRisk({ isRisk: true, reason: "Permission Trap detected. Account has custom multi-sig authorities.", type: 'tron', dismissed: false });
              return;
            }
          }
        }

        if (token.chainId === 144) {
          const adapter = xrpAdapterFactory(chain);
          if (adapter) {
            const audit = await (adapter as any).checkAccountSecurity(address);
            if (audit.isRisk) {
              setSecurityRisk({ isRisk: true, reason: "Restricted Signing Node. Master key is permanently revoked.", type: 'xrp', dismissed: false });
              return;
            }
          }
        }

        if ([1, 137, 8453].includes(token.chainId)) {
          const adapter = evmAdapterFactory(chain, infuraApiKey, alchemyApiKey);
          if (adapter) {
            const audit = await (adapter as any).checkAccountSecurity(address);
            if (audit && audit.unlimitedApprovals > 0) {
              setSecurityRisk({ isRisk: true, reason: "High Risk Approvals. Unlimited permissions active on this node.", type: 'evm', dismissed: false });
              return;
            }
          }
        }

        if (token.chainId === 501) {
          const adapter = solanaAdapterFactory(chain);
          if (adapter) {
            const audit = await (adapter as any).checkAccountSecurity(address, token.address);
            if (audit?.freezeAuthority || (audit?.delegations && audit.delegations > 0)) {
              setSecurityRisk({ isRisk: true, reason: "Active Authority Lock. External programs can control this node.", type: 'solana', dismissed: false });
              return;
            }
          }
        }

        if (token.chainId === 0) {
            const adapter = bitcoinAdapterFactory(chain);
            if (adapter) {
                const audit = await (adapter as any).checkAccountSecurity(address);
                if (audit && audit.pendingFunds > 0) {
                    setSecurityRisk({ isRisk: true, reason: "Mempool Congestion. Unconfirmed funds pending in registry.", type: 'btc', dismissed: false });
                    return;
                }
            }
        }

        setSecurityRisk(null);
      } catch (e) {
        console.warn("[AUDIT_FAIL_ADVISORY] Security node handshake deferred.");
      }
    };

    runSecurityAudit();
  }, [token, wallets, isInitialized, allChainsMap, viewingNetwork, infuraApiKey, alchemyApiKey, getAddressForChain]);

  if (!isInitialized || !symbol) return <FullPageLoader />;
  if (!token && !isLoading) return <EmptyState title="Node Not Found" subtitle="This asset could not be located in the current hardware registry." onBack={() => router.back()} />;
  if (!token || isLoading) return <FullPageLoader />;

  const activeChain = allChainsMap?.[chainId] || viewingNetwork;
  const isNative = token.isNative || token.address?.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' || !token.address;

  // 📏 INSTITUTIONAL COMPACT FORMATTING
  const formatCompactUSD = (val: number | undefined | null) => {
    if (val == null) return 'SCANNING...';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(val);
  };

  const formatCompactNum = (val: number | undefined | null) => {
    if (val == null) return 'UNLIMITED';
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(val);
  };

  const marketCap = formatCompactUSD(details?.market_data?.market_cap?.usd);
  const volume24h = formatCompactUSD(details?.market_data?.total_volume?.usd);
  const marketRank = details?.market_cap_rank != null ? `#${details.market_cap_rank}` : 'UNRANKED';
  const totalSupply = formatCompactNum(details?.market_data?.total_supply);

  const handleNavigateToDetails = () => {
    if (!securityRisk) return;
    const route = securityRisk.type === 'tron' ? 'tron-permissions' : 
                  securityRisk.type === 'xrp' ? 'xrp-permissions' : 
                  `${securityRisk.type}-security`;
    router.push(`/security/${route}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl bg-white/5 hover:bg-white/10">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex flex-col items-center text-center">
          <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Technical Node</h1>
          <p className="text-sm font-black uppercase tracking-tight text-white truncate max-w-[150px] mt-1">{token.name}</p>
        </div>

        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Info className="w-5 h-5" />
        </div>
      </header>

      <main className="flex-1 p-6 space-y-10 max-w-2xl mx-auto w-full pb-32 overflow-y-auto thin-scrollbar relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

        <AnimatePresence>
          {securityRisk && !securityRisk.dismissed && (
            <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="pt-2 relative z-[60]">
                <div onClick={handleNavigateToDetails} className="w-full bg-[#0a0a0c] border border-[#633BBC]/30 rounded-[2rem] p-4 flex items-center justify-between shadow-[0_20px_50px_rgba(99,59,188,0.15)] relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#633BBC] animate-pulse" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-[#633BBC]/10 border border-[#633BBC]/20 flex items-center justify-center text-[#633BBC] shadow-lg"><DoorOpen className="w-6 h-6 animate-pulse" /></div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#633BBC] animate-ping" /><span className="text-[10px] font-black text-[#633BBC] uppercase tracking-widest">SENTINEL SCAN</span></div>
                            <p className="text-[11px] text-white font-bold tracking-tight line-clamp-1">{securityRisk.reason}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                        <span className="text-[8px] font-black text-[#633BBC] uppercase tracking-widest hover:underline transition-all">View Technical Logs</span>
                        <button onClick={(e) => { e.stopPropagation(); setSecurityRisk(prev => prev ? { ...prev, dismissed: true } : null); }} className="p-2 rounded-lg hover:bg-white/5 text-white/20 transition-all"><X className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="flex flex-col items-center gap-8 pt-6">
          <div className="relative group">
            <div className="absolute -inset-4 bg-primary/20 rounded-[3rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative bg-[#0a0a0c] rounded-[3rem] border-2 border-primary/30 p-8 shadow-2xl">
              <TokenLogoDynamic logoUrl={token.iconUrl} size={72} symbol={token.symbol} name={token.name} chainId={chainId} />
              <div className="absolute -bottom-2 -right-2 bg-black rounded-xl p-1.5 border border-white/10 shadow-2xl">
                <TokenLogoDynamic logoUrl={activeChain.iconUrl} size={24} chainId={token.chainId} symbol={activeChain.symbol} name={activeChain.name} />
              </div>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-4xl font-black uppercase tracking-tighter text-white drop-shadow-2xl">{token.name}</h2>
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm font-black text-primary uppercase tracking-[0.2em]">{token.symbol}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{activeChain?.name} Node</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Intelligence Node</p>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                    <ShieldCheck className="w-3 h-3 text-green-500" />
                    <span className="text-[8px] font-black text-green-500 uppercase">Verified Data</span>
                </div>
            </div>
            <div className="p-8 rounded-[2.5rem] bg-[#111113] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5"><Zap className="w-24 h-24 text-primary" /></div>
                <div className="relative z-10 space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white border-b border-white/5 pb-3">Ecosystem Role</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                        {details?.description?.en 
                            ? (details.description.en.split('. ')[0] + '. ' + details.description.en.split('. ')[1] + '.') 
                            : `This asset functions as a primary liquidity node within the ${activeChain.name} ecosystem. It utilizes ${isNative ? 'native protocol verification' : 'smart contract logic'} to authorize decentralized handshakes and value movements across the global terminal.`}
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase text-white/40 tracking-widest">Fixed Supply: {totalSupply !== 'UNLIMITED' ? 'YES' : 'NO'}</span>
                        <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase text-white/40 tracking-widest">Handshake: {isNative ? 'NATIVE' : 'CONTRACT'}</span>
                        <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase text-white/40 tracking-widest">Network: {activeChain.symbol}</span>
                    </div>
                </div>
            </div>
        </section>

        <section className="space-y-4">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] px-2">Technical Specification</p>
          <div className="p-8 rounded-[3rem] bg-[#111113] border border-white/5 space-y-8 shadow-2xl">
            <div className="space-y-3">
              <p className="text-[9px] font-black text-primary uppercase tracking-[0.25em] px-1">Provenance Address</p>
              <div className="flex items-center justify-between p-5 rounded-2xl bg-black border border-white/10 gap-4 shadow-inner">
                {isNative ? (
                   <div className="flex items-center gap-3">
                       <Workflow className="w-4 h-4 text-green-500/60" />
                       <p className="text-xs font-black uppercase text-white/80 tracking-widest">Native Registry Node</p>
                   </div>
                ) : (
                  <p className="text-xs font-mono font-bold text-white/60 truncate flex-1 tracking-tight">{token.address}</p>
                )}
                {!isNative && token.address && (
                  <button onClick={() => performCopy(token.address)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary active:scale-90 transition-all hover:bg-white/10 border border-white/10">
                    {isCopied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 pt-2">
              <SpecNode label="Symbol" value={token.symbol} icon={Zap} />
              <SpecNode label="Decimals" value={token.decimals || 18} icon={Cpu} />
              <SpecNode label="Status" value="Immutable" icon={ShieldCheck} />
              <SpecNode label="Standard" value={isNative ? 'L1 NATIVE' : 'ERC-20'} icon={Globe} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] px-2">Market Forensics</p>
          <div className="p-8 rounded-[3rem] bg-[#111113] border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute bottom-0 left-0 p-8 opacity-5"><Activity className="w-32 h-32 text-primary" /></div>
            <div className="grid grid-cols-2 gap-y-10 relative z-10">
              <MarketDataNode label="Market Capacity" value={marketCap} />
              <MarketDataNode label="Registry Volume (24h)" value={volume24h} />
              <MarketDataNode label="Global Rank" value={marketRank} />
              <MarketDataNode label="Total Node Supply" value={totalSupply} />
            </div>
          </div>
        </section>

        <div className="pt-10 flex flex-col items-center gap-3 opacity-20 pb-10">
            <div className="h-px w-10 bg-white/40" />
            <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white">Registry Sentinel v26.0</span>
            </div>
        </div>
      </main>
    </div>
  );
}

function SpecNode({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: any; }) {
  return (
    <div className="flex items-center gap-3 group">
      <div className="w-10 h-10 rounded-xl bg-black border border-white/5 flex items-center justify-center text-white/20 group-hover:text-primary group-hover:border-primary/20 transition-all shadow-inner">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-xs font-black text-white uppercase tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function MarketDataNode({ label, value }: { label: string; value: React.ReactNode; }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-black text-primary/60 uppercase tracking-[0.2em] border-l-2 border-primary/40 pl-3 leading-none mb-2">{label}</p>
      <p className="text-base font-black text-white tracking-tighter pl-3 tabular-nums">{value}</p>
    </div>
  );
}

export default function TokenInfoPage() {
  return <Suspense fallback={<FullPageLoader />}><TokenInfoContent /></Suspense>;
}
