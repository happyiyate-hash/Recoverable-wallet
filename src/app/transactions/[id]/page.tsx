'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  Copy,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  History,
  Zap,
  Clock,
  MoreVertical,
  ArrowRight,
  ShieldAlert,
  Fingerprint,
  Activity,
  Workflow
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/user-provider';
import { useWallet } from '@/contexts/wallet-provider';
import { useCurrency } from '@/contexts/currency-provider';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

/**
 * CINEMATIC TRANSACTION AUDIT TERMINAL
 * Version: 2.1.0 (Stability & Context Patch)
 */
export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useUser(); // 🛡️ Fix: Added profile to context
  const { allChainsMap = {} } = useWallet();
  const { formatFiat } = useCurrency();
  const [isCopied, copy] = useCopyToClipboard();

  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const txId = useMemo(() => {
    const raw = params?.id;
    if (!raw) return '';
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  useEffect(() => {
    async function fetchTx() {
      if (!txId || !user) return;
      try {
        setLoading(true);
        // 🔍 PROBE BOTH INTERNAL AND EXTERNAL REGISTRIES
        const [internalRes, externalRes] = await Promise.all([
          supabase.from('wnc_transfers').select('*, sender:sender_id(name, photo_url), receiver:receiver_id(name, photo_url)').eq('id', txId).maybeSingle(),
          supabase.from('transactions').select('*').eq('id', txId).maybeSingle(),
        ]);

        const data = internalRes?.data || externalRes?.data;
        if (!data) { setTx(null); return; }

        const amount = Number(data.amount_wnc ?? data.amount ?? 0);
        const isOut = data.sender_id === user.id || data.type === 'withdrawal' || data.type === 'transfer_out';
        const hash = data.tx_hash || data.id || '';

        setTx({
          ...data,
          amount,
          hash,
          isOut,
          isInternal: !!internalRes?.data,
          token: data.token_symbol || 'WNC',
          timestamp: data.created_at || data.timestamp || new Date().toISOString(),
        });
      } catch (error) {
        console.error('[TX_AUDIT_FAIL]', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTx();
  }, [txId, user]);

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-[#050505]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!tx) return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#050505] p-10 text-center gap-6">
      <ShieldAlert className="w-16 h-16 text-red-500/20" />
      <p className="text-xs font-black uppercase text-white/40 tracking-widest">Registry Node Mismatch</p>
      <Button onClick={() => router.back()} className="rounded-2xl h-14 px-8 bg-white/5 border border-white/10 font-black uppercase tracking-widest text-[10px]">Return to Terminal</Button>
    </div>
  );

  const senderName = tx.isOut ? "You" : tx.sender?.name || 'External Node';
  const receiverName = tx.isOut ? (tx.receiver?.name || 'External Node') : "You";

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white overflow-hidden">
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50 px-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl hover:bg-white/10 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Audit Sentinel</h1>
          <p className="text-sm font-black uppercase tracking-tight text-white mt-1">Transaction Verified</p>
        </div>
        <Button variant="ghost" size="icon" className="rounded-xl"><MoreVertical className="w-5 h-5 text-white/20" /></Button>
      </header>

      <main className="flex-1 p-6 space-y-12 max-w-lg mx-auto w-full pb-32 overflow-y-auto thin-scrollbar relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

        {/* 💎 PRIMARY VALUE NODE */}
        <section className="flex flex-col items-center gap-8 pt-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <div className={cn(
              "w-24 h-24 rounded-[3rem] border-2 flex items-center justify-center shadow-2xl relative z-10 overflow-hidden bg-black",
              tx.isOut ? "border-red-500/30" : "border-green-500/30"
            )}>
              <div className={cn(
                "absolute inset-0 opacity-10",
                tx.isOut ? "bg-red-500" : "bg-green-500"
              )} />
              {tx.isOut ? <ArrowUpRight className="w-10 h-10 text-red-500" /> : <ArrowDownLeft className="w-10 h-10 text-green-500" />}
            </div>
            
            <div className="absolute -bottom-2 -right-2 bg-[#050505] rounded-2xl p-1.5 border border-white/10 shadow-2xl z-20">
              <TokenLogoDynamic symbol={tx.token} size={32} />
            </div>
          </motion.div>

          <div className="text-center space-y-2">
            <motion.h2 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={cn(
                'text-5xl font-black tracking-tighter tabular-nums',
                tx.isOut ? 'text-white' : 'text-green-500'
              )}
            >
              {tx.isOut ? '-' : '+'}
              {Number(tx.amount).toLocaleString()} {tx.token}
            </motion.h2>

            <p className="text-sm text-white/40 font-bold uppercase tracking-widest">
              ≈ {formatFiat?.(tx.amount) || ''}
            </p>

            <div className="flex items-center justify-center gap-2 pt-2">
               <div className={cn(
                 "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border shadow-lg",
                 tx.isInternal ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/10 text-white/60"
               )}>
                 {tx.isInternal ? 'Registry Settlement' : 'Public Ledger'}
               </div>
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
            </div>
          </div>
        </section>

        {/* 🤝 REGISTRY FLOW CARD */}
        <section className="space-y-4">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2">Registry Flow</p>
          
          <div className="p-8 rounded-[3rem] bg-[#111113] border border-white/5 space-y-10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16" />
             
             <div className="flex items-center justify-between gap-4 relative z-10">
                {/* SENDER */}
                <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
                    <Avatar className="w-16 h-16 rounded-2xl border border-white/10 shadow-xl bg-black">
                        <AvatarImage src={tx.isOut ? (profile?.photo_url || '') : (tx.sender?.photo_url || '')} className="object-cover" />
                        <AvatarFallback className="bg-white/5 text-white/20 font-black">S</AvatarFallback>
                    </Avatar>
                    <div className="text-center w-full">
                        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">From Node</p>
                        <p className="text-xs font-black text-white uppercase truncate">@{senderName}</p>
                    </div>
                </div>

                <div className="flex-shrink-0 flex flex-col items-center pt-2">
                   <div className="w-full h-[1px] bg-white/5 relative w-12">
                      <motion.div 
                        animate={{ x: [-10, 10], opacity: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </motion.div>
                   </div>
                </div>

                {/* RECIPIENT */}
                <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
                    <Avatar className="w-16 h-16 rounded-2xl border border-white/10 shadow-xl bg-black">
                        <AvatarImage src={tx.isOut ? (tx.receiver?.photo_url || '') : (profile?.photo_url || '')} className="object-cover" />
                        <AvatarFallback className="bg-white/5 text-white/20 font-black">R</AvatarFallback>
                    </Avatar>
                    <div className="text-center w-full">
                        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">To Node</p>
                        <p className="text-xs font-black text-white uppercase truncate">@{receiverName}</p>
                    </div>
                </div>
             </div>

             <div className="h-px bg-white/5 w-full" />

             <div className="space-y-6">
                <AuditRow label="Time Handshake" value={new Date(tx.timestamp).toLocaleString()} icon={Clock} />
                <AuditRow label="Registry ID" value={tx.hash ? `${tx.hash.slice(0, 12)}...${tx.hash.slice(-8)}` : 'N/A'} icon={Fingerprint} isMono />
                <AuditRow label="Network Node" value={tx.isInternal ? 'SmarterSeller Hub' : 'Mainnet Authority'} icon={Workflow} />
                <AuditRow label="Protocol Status" value="Settled & Immutable" icon={ShieldCheck} color="text-green-500" />
             </div>
          </div>
        </section>

        {/* 🛠️ FORENSIC ACTIONS */}
        <section className="space-y-4">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2">Forensic Actions</p>
          <div className="grid grid-cols-2 gap-3">
             <Button 
                onClick={() => copy(tx.hash)}
                className="h-16 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 font-black uppercase text-[10px] tracking-widest gap-3 shadow-xl group"
             >
                {isCopied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />}
                Copy Hash
             </Button>
             
             <Button 
                variant="ghost"
                onClick={() => {
                   const config = allChainsMap[tx.chainId || 1];
                   if (config?.explorer) window.open(`${config.explorer}/tx/${tx.hash}`, '_blank');
                }}
                className="h-16 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 font-black uppercase text-[10px] tracking-widest gap-3 shadow-xl"
             >
                <ExternalLink className="w-4 h-4 text-primary" />
                Explorer
             </Button>
          </div>
        </section>

        <div className="pt-10 flex flex-col items-center gap-3 opacity-20 pb-10">
          <div className="h-px w-8 bg-white/40" />
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-primary fill-primary" />
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white">Registry Watchdog v4.0 Active</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function AuditRow({ label, value, icon: Icon, color = 'text-white/90', isMono = false }: any) {
  return (
    <div className="flex items-center justify-between gap-4 group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-black border border-white/5 flex items-center justify-center text-white/20 group-hover:text-primary/40 transition-colors shadow-inner">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[9px] font-black uppercase text-white/30 tracking-[0.2em]">{label}</span>
      </div>
      <span className={cn(
        "text-[10px] font-bold text-right",
        isMono ? "font-mono tracking-tighter" : "tracking-tight",
        color
      )}>
        {value}
      </span>
    </div>
  );
}
