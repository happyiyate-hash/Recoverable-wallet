'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-provider';
import { useWallet } from '@/contexts/wallet-provider';
import { useCurrency } from '@/contexts/currency-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, ArrowUpRight, ArrowDownLeft, Zap, ExternalLink, 
  Search, SlidersHorizontal, Layers, WalletCards, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Mock Transaction History
const mockTxs = [
    { id: '1', type: 'receive', asset: 'USDC', amount: '1,500.00', fiat: '$1,500.00', date: 'Just now', status: 'COMPLETED', from: '0x3F...9aB2' },
    { id: '2', type: 'send', asset: 'ETH', amount: '0.45', fiat: '$1,350.00', date: '2 hrs ago', status: 'COMPLETED', to: '0x71...c4e9' },
    { id: '3', type: 'swap', asset: 'USDT', amount: '300.00', fiat: '$300.00', date: 'Yesterday', status: 'COMPLETED', detail: 'Swapped from SOL' },
    { id: '4', type: 'send', asset: 'MATIC', amount: '150.00', fiat: '$120.00', date: 'Yesterday', status: 'PENDING', to: '0x1A...B88c' },
    { id: '5', type: 'receive', asset: 'ETH', amount: '2.5', fiat: '$7,500.00', date: '3 days ago', status: 'COMPLETED', from: '0x99...44a1' },
];

export default function DesktopWalletPage() {
  const router = useRouter();
  const { user } = useUser();
  const { allAssets, isInitialized, wallets, networkStates } = useWallet();
  const { formatFiat } = useCurrency();
  const [search, setSearch] = useState('');

  const totalFiat = useMemo(() => {
    return allAssets.reduce((sum, asset) => sum + (asset.fiatValueUsd || 0), 0);
  }, [allAssets]);

  const filteredAssets = useMemo(() => {
     let assets = allAssets.filter(a => parseFloat(a.balance) > 0);
     if (search) assets = assets.filter(a => a.symbol.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase()));
     return assets.sort((a,b) => (b.fiatValueUsd || 0) - (a.fiatValueUsd || 0));
  }, [allAssets, search]);

  if (!isInitialized) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#633BBC]" /></div>;

  return (
    <div className="flex w-full h-full gap-6 p-8 relative">
       {/* Background ambient glow */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#633BBC]/5 blur-[150px] rounded-full pointer-events-none" />

       {/* LEFT: ASSET HUB */}
       <section className="w-1/2 h-full flex flex-col gap-6 z-10">
          {/* Header Stats */}
          <div className="flex items-end justify-between w-full h-32 shrink-0 p-8 rounded-[3rem] bg-black/60 border border-[#633BBC]/20 shadow-[0_4px_30px_rgba(99,59,188,0.1)] backdrop-blur-xl">
             <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#633BBC] mb-2 flex items-center gap-2">
                   <WalletCards className="w-4 h-4" /> Comprehensive Net Worth
                </p>
                <h1 className="text-5xl font-black text-white tracking-tighter">{formatFiat(totalFiat)}</h1>
             </div>
             <div className="flex flex-col gap-1 items-end">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                   +2.45% (24H)
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">
                   {wallets.length} Secured Nodes Active
                </p>
             </div>
          </div>

          {/* Asset List Inventory */}
          <div className="flex-1 bg-black/60 border border-[#633BBC]/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl rounded-[3rem] flex flex-col overflow-hidden relative">
             <div className="absolute top-0 inset-x-0 h-[100px] bg-gradient-to-b from-[#633BBC]/5 to-transparent pointer-events-none" />
             
             <div className="p-8 pb-4 shrink-0 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                   <Layers className="w-5 h-5 text-[#633BBC]" />
                   <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Asset Inventory</h2>
                </div>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 hover:border-[#633BBC]/40 transition-colors">
                      <Search className="w-4 h-4 text-[#633BBC]" />
                      <input 
                         type="text" 
                         placeholder="SEARCH TICKER..." 
                         value={search}
                         onChange={(e) => setSearch(e.target.value)}
                         className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-white placeholder:text-white/20 w-32" 
                      />
                   </div>
                   <button className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl hover:border-[#633BBC]/40 transition-colors text-[#633BBC]">
                      <SlidersHorizontal className="w-4 h-4" />
                   </button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto thin-scrollbar px-6 pb-6 space-y-3 z-10">
                {filteredAssets.map(asset => {
                   const isEvm = asset.chainId !== 0 && asset.chainId !== -1;
                   const network = networkStates[isEvm ? 'evm' : asset.symbol.toLowerCase() as any] || { status: 'offline' };
                   const statusColor = network.status === 'synced' ? 'bg-emerald-500' : 'bg-red-500';

                   return (
                     <div key={asset.symbol + asset.chainId} className="flex items-center justify-between p-5 rounded-[2rem] bg-black/40 border border-white/5 hover:border-[#633BBC]/50 hover:bg-[#633BBC]/10 transition-all group cursor-pointer shadow-lg">
                         <div className="flex items-center gap-5">
                             <div className="relative">
                                <img src={asset.iconUrl || ''} alt={asset.symbol} className="w-12 h-12 rounded-[1rem] bg-black border border-[#633BBC]/30 p-2 shadow-[0_0_15px_rgba(99,59,188,0.2)]" />
                                <div className={cn("absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black", statusColor)} />
                             </div>
                             <div>
                                <div className="flex items-center gap-2">
                                   <p className="font-black text-base text-white uppercase tracking-tight">{asset.symbol}</p>
                                   <div className="px-2 py-0.5 rounded-md bg-white/10 text-[8px] font-black uppercase tracking-widest text-[#633BBC]">
                                      {isEvm ? 'EVM' : asset.symbol}
                                   </div>
                                </div>
                                <p className="text-[10px] text-white/40 font-bold tracking-widest">{asset.name}</p>
                             </div>
                         </div>
                         <div className="text-right">
                            <p className="text-base font-black text-white tabular-nums">{parseFloat(asset.balance).toLocaleString('en-US', {maximumFractionDigits: 4})}</p>
                            <div className="flex items-center justify-end gap-2 mt-1">
                               <p className={cn("text-[9px] font-black", (asset.pctChange24h||0) >= 0 ? "text-emerald-500" : "text-red-500")}>
                                 {((asset.pctChange24h||0) >= 0) ? '+' : ''}{(asset.pctChange24h||0).toFixed(2)}%
                               </p>
                               <p className="text-[11px] text-[#633BBC] font-bold tabular-nums">{formatFiat(asset.fiatValueUsd || 0)}</p>
                            </div>
                         </div>
                     </div>
                   );
                })}
                {filteredAssets.length === 0 && (
                   <div className="w-full text-center py-10">
                      <p className="text-xs font-black uppercase tracking-widest text-white/20">No matching nodes located.</p>
                   </div>
                )}
             </div>
          </div>
       </section>

       {/* RIGHT: ACTIONS & FEED */}
       <section className="w-1/2 h-full flex flex-col gap-6 z-10">
          
          {/* Action Cards */}
          <div className="flex gap-4 w-full h-32 shrink-0">
             <div onClick={() => router.push('/send')} className="flex-1 rounded-[3rem] bg-gradient-to-br from-[#633BBC]/30 to-[#633BBC]/5 border border-[#633BBC]/40 shadow-[0_0_30px_rgba(99,59,188,0.2)] backdrop-blur-xl p-6 flex flex-col justify-between cursor-pointer hover:border-[#633BBC]/80 hover:shadow-[0_0_40px_rgba(99,59,188,0.4)] transition-all group overflow-hidden relative">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#633BBC]/20 rounded-full blur-[20px] group-hover:bg-[#633BBC]/40 transition-colors" />
                <div className="w-10 h-10 rounded-2xl bg-black border border-[#633BBC]/30 flex items-center justify-center text-white group-hover:scale-110 group-hover:-rotate-12 transition-transform shadow-[0_0_15px_rgba(99,59,188,0.5)] z-10">
                   <ArrowUpRight className="w-5 h-5" />
                </div>
                <div className="z-10">
                   <p className="text-lg font-black uppercase text-white tracking-widest">Send</p>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Transmit Assets</p>
                </div>
             </div>
             
             <div onClick={() => router.push('/receive')} className="flex-1 rounded-[3rem] bg-black/60 border border-[#633BBC]/20 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl p-6 flex flex-col justify-between cursor-pointer hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all group overflow-hidden relative">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-[20px] group-hover:bg-emerald-500/20 transition-colors" />
                <div className="w-10 h-10 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-white group-hover:scale-110 group-hover:rotate-12 transition-transform shadow-xl group-hover:border-emerald-500/40 group-hover:text-emerald-400 z-10">
                   <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div className="z-10">
                   <p className="text-lg font-black uppercase text-white tracking-widest">Receive</p>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Obtain Assets</p>
                </div>
             </div>
          </div>

          {/* Transaction Ledger */}
          <div className="flex-1 bg-black/60 border border-[#633BBC]/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl rounded-[3rem] flex flex-col overflow-hidden">
             <div className="p-8 pb-4 shrink-0 flex justify-between items-center border-b border-white/5">
                <div className="flex items-center gap-3">
                   <Zap className="w-5 h-5 text-[#633BBC]" />
                   <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Network Ledger</h2>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest text-[#633BBC] hover:text-white transition-colors flex items-center gap-1">
                   View Block Explorer <ExternalLink className="w-3 h-3" />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto thin-scrollbar p-6 space-y-4">
                {mockTxs.map((tx) => (
                   <div key={tx.id} className="flex items-center justify-between p-5 rounded-[2rem] bg-black/40 border border-white/5 hover:bg-white/5 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                         <div className={cn(
                            "w-12 h-12 rounded-[1rem] flex items-center justify-center border",
                            tx.type === 'receive' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]" :
                            tx.type === 'send' ? "bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" :
                            "bg-[#633BBC]/10 border-[#633BBC]/30 text-[#633BBC] shadow-[0_0_15px_rgba(99,59,188,0.2)]"
                         )}>
                            {tx.type === 'receive' ? <ArrowDownLeft className="w-5 h-5" /> : 
                             tx.type === 'send' ? <ArrowUpRight className="w-5 h-5" /> : 
                             <Zap className="w-5 h-5" />}
                         </div>
                         <div>
                            <p className="text-sm font-black text-white uppercase tracking-tight">
                               {tx.type === 'receive' ? 'Incoming Transfer' : tx.type === 'send' ? 'Outgoing Transfer' : 'Dex Swap'}
                            </p>
                            <p className="text-[10px] text-white/40 font-bold tracking-widest mt-1">
                               {tx.status === 'PENDING' ? <span className="text-amber-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Processing</span> : tx.date}
                            </p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className={cn("text-base font-black tabular-nums", 
                            tx.type === 'receive' ? "text-emerald-500" : 
                            tx.status === 'PENDING' ? "text-amber-500" : "text-white"
                         )}>
                            {tx.type === 'receive' ? '+' : tx.type === 'send' ? '-' : ''}{tx.amount} {tx.asset}
                         </p>
                         <p className="text-[10px] text-white/40 font-bold tabular-nums mt-1">{tx.fiat}</p>
                      </div>
                   </div>
                ))}
             </div>
             
             {/* Security Footer Notice */}
             <div className="p-4 bg-[#633BBC]/10 border-t border-[#633BBC]/30 flex items-center justify-center gap-3">
                 <ShieldAlert className="w-4 h-4 text-[#633BBC]" />
                 <p className="text-[9px] font-black uppercase tracking-widest text-[#633BBC]">End-to-End Encryption Enabled • Sentinel Guards Active</p>
             </div>
          </div>
       </section>
    </div>
  );
}
