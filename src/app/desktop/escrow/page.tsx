'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/contexts/user-provider';
import { supabase } from '@/lib/supabase/client';
import { EscrowTrade, EscrowRequest } from '@/lib/services/escrow-service';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, Lock, ShieldCheck, Clock, CheckCircle2, AlertTriangle, ArrowRight, Zap 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function DesktopEscrowPage() {
  const { user } = useUser();
  const [trades, setTrades] = useState<EscrowTrade[]>([]);
  const [requests, setRequests] = useState<EscrowRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchEscrow = async () => {
      try {
        const [{ data: tradeData }, { data: reqData }] = await Promise.all([
          supabase.from('escrow_trades').select('*, seller:profiles!seller_id(name,email), buyer:profiles!buyer_id(name,email)').or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`).order('created_at', { ascending: false }),
          supabase.from('escrow_requests').select('*, requester:profiles!requester_id(name,email), receiver:profiles!receiver_id(name,email)').or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: false })
        ]);
        if (tradeData) setTrades(tradeData as any[]);
        if (reqData) setRequests(reqData as any[]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEscrow();

    const channel = supabase.channel('desktop-escrow-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escrow_trades' }, fetchEscrow)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escrow_requests' }, fetchEscrow)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (isLoading) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#633BBC]" /></div>;

  // Kanban Columns Data
  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const activeTrades = trades.filter(t => ['AWAITING_PAYMENT', 'PAYMENT_LOCKED', 'AWAITING_RELEASE', 'DISPUTED'].includes(t.status));
  const completedTrades = trades.filter(t => ['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(t.status));

  return (
    <div className="flex flex-col w-full h-full p-8 relative gap-8">
       {/* Background ambient glow */}
       <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#633BBC]/10 blur-[150px] rounded-full pointer-events-none" />
       
       {/* HEADER */}
       <header className="w-full shrink-0 flex items-center justify-between z-10">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
               <ShieldCheck className="w-8 h-8 text-[#633BBC]" /> Escrow Board
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#633BBC] mt-1 ml-11">
               Decentralized Trust Network
            </p>
          </div>
          <div className="flex gap-4">
             <div className="px-5 py-2 rounded-2xl bg-black/40 border border-[#633BBC]/20 shadow-[0_4px_24px_rgba(99,59,188,0.1)] backdrop-blur-xl flex flex-col items-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-[#633BBC]">Active Volume</p>
                 <p className="text-lg font-black text-white">{activeTrades.length} Nodes</p>
             </div>
             <button className="h-full px-8 rounded-[1.5rem] bg-[#633BBC] hover:bg-[#633BBC]/80 transition-colors shadow-[0_0_20px_rgba(99,59,188,0.4)] text-[11px] font-black uppercase tracking-[0.2em] text-[#050505]">
                New Contract
             </button>
          </div>
       </header>

       {/* KANBAN BOARD */}
       <div className="flex-1 flex gap-6 overflow-hidden z-10">
          
          {/* COLUMN 1: PENDING REQUESTS */}
          <div className="w-1/3 h-full flex flex-col gap-4 bg-black/40 border border-white/5 rounded-[3rem] p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
             <div className="flex items-center justify-between shrink-0 px-2">
                <div className="flex items-center gap-2 text-amber-500">
                   <Clock className="w-4 h-4" />
                   <h2 className="text-sm font-black uppercase tracking-[0.2em]">Pending</h2>
                </div>
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-black pointer-events-none">{pendingRequests.length}</div>
             </div>
             <div className="flex-1 overflow-y-auto thin-scrollbar space-y-4 pr-2">
                <AnimatePresence>
                   {pendingRequests.map(req => (
                     <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer transition-all group shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                           <div className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-widest border border-amber-500/20">Awaiting Auth</div>
                           <p className="text-[9px] text-white/40 font-bold tracking-widest">{formatDistanceToNow(new Date(req.created_at))} ago</p>
                        </div>
                        <p className="text-2xl font-black text-white mb-1 tabular-nums">{req.fiat_amount} <span className="text-sm text-white/40">{req.fiat_currency}</span></p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-white/60 mb-4">
                           <span className="truncate max-w-[120px]">{(req as any).requester?.email}</span>
                           <ArrowRight className="w-3 h-3 text-white/20" />
                           <span className="truncate max-w-[120px]">{(req as any).receiver?.email}</span>
                        </div>
                        <div className="w-full h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-[9px] font-black uppercase tracking-[0.2em] group-hover:bg-amber-500 group-hover:text-[#050505] transition-colors">
                           Review Initializer
                        </div>
                     </motion.div>
                   ))}
                   {pendingRequests.length === 0 && <div className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-white/20">Empty Queue</div>}
                </AnimatePresence>
             </div>
          </div>

          {/* COLUMN 2: ACTIVE TRADES */}
          <div className="w-1/3 h-full flex flex-col gap-4 bg-black/40 border border-[#633BBC]/30 rounded-[3rem] p-6 shadow-[0_0_40px_rgba(99,59,188,0.1)] backdrop-blur-xl relative overflow-hidden">
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#633BBC] to-transparent" />
             <div className="flex items-center justify-between shrink-0 px-2">
                <div className="flex items-center gap-2 text-[#633BBC]">
                   <Zap className="w-4 h-4" />
                   <h2 className="text-sm font-black uppercase tracking-[0.2em]">Active Nodes</h2>
                </div>
                <div className="w-6 h-6 rounded-full bg-[#633BBC]/20 flex items-center justify-center text-[10px] font-black pointer-events-none">{activeTrades.length}</div>
             </div>
             <div className="flex-1 overflow-y-auto thin-scrollbar space-y-4 pr-2">
                <AnimatePresence>
                   {activeTrades.map(trade => (
                     <motion.div key={trade.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="p-5 rounded-[2rem] bg-white/[0.02] border border-[#633BBC]/30 hover:border-[#633BBC] hover:bg-[#633BBC]/10 hover:shadow-[0_0_20px_rgba(99,59,188,0.2)] cursor-pointer transition-all group">
                        <div className="flex justify-between items-start mb-4">
                           <div className={cn("px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border", 
                              trade.status === 'DISPUTED' ? "bg-red-500/20 text-red-500 border-red-500/30" : "bg-[#633BBC]/20 text-[#633BBC] border-[#633BBC]/30"
                           )}>
                              {trade.status.replace('_', ' ')}
                           </div>
                           <p className="text-[9px] text-[#633BBC]/60 font-bold tracking-widest">{formatDistanceToNow(new Date(trade.created_at))} ago</p>
                        </div>
                        <p className="text-2xl font-black text-white mb-1 tabular-nums">{trade.crypto_amount} <span className="text-sm text-[#633BBC]">{trade.crypto_currency}</span></p>
                        <p className="text-xs font-bold text-white/40 mb-4">{trade.fiat_amount} {trade.fiat_currency}</p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-white/60 mb-4 bg-black/40 p-2 rounded-xl border border-white/5">
                           <span className="truncate max-w-[100px] text-red-400">{(trade as any).seller?.name || 'Seller'}</span>
                           <ArrowRight className="w-3 h-3 text-white/20" />
                           <Lock className="w-3 h-3 text-[#633BBC]" />
                           <ArrowRight className="w-3 h-3 text-white/20" />
                           <span className="truncate max-w-[100px] text-emerald-400">{(trade as any).buyer?.name || 'Buyer'}</span>
                        </div>
                     </motion.div>
                   ))}
                   {activeTrades.length === 0 && <div className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-[#633BBC]/40">No Active Contracts</div>}
                </AnimatePresence>
             </div>
          </div>

          {/* COLUMN 3: COMPLETED */}
          <div className="w-1/3 h-full flex flex-col gap-4 bg-black/40 border border-white/5 rounded-[3rem] p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
             <div className="flex items-center justify-between shrink-0 px-2">
                <div className="flex items-center gap-2 text-emerald-500">
                   <CheckCircle2 className="w-4 h-4" />
                   <h2 className="text-sm font-black uppercase tracking-[0.2em]">Settled</h2>
                </div>
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-black pointer-events-none">{completedTrades.length}</div>
             </div>
             <div className="flex-1 overflow-y-auto thin-scrollbar space-y-4 pr-2">
                <AnimatePresence>
                   {completedTrades.map(trade => (
                     <motion.div key={trade.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 cursor-pointer transition-all group opacity-70 hover:opacity-100">
                        <div className="flex justify-between items-start mb-4">
                           <div className={cn("px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border", 
                              trade.status === 'COMPLETED' ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/20" : "bg-zinc-500/20 text-zinc-400 border-zinc-500/20"
                           )}>
                              {trade.status}
                           </div>
                           <p className="text-[9px] text-white/30 font-bold tracking-widest">{formatDistanceToNow(new Date(trade.updated_at))} ago</p>
                        </div>
                        <p className="text-xl font-black text-white/60 mb-1 tabular-nums">{trade.crypto_amount} <span className="text-xs text-white/30">{trade.crypto_currency}</span></p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-white/40">
                           <span className="truncate">{trade.role === 'buyer' ? 'Purchased from ' + ((trade as any).seller?.name || 'user') : 'Sold to ' + ((trade as any).buyer?.name || 'user')}</span>
                        </div>
                     </motion.div>
                   ))}
                   {completedTrades.length === 0 && <div className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-white/20">Empty History</div>}
                </AnimatePresence>
             </div>
          </div>

       </div>
    </div>
  );
}
