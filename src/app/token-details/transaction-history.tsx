'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser } from '@/contexts/user-provider';
import { useWallet } from '@/contexts/wallet-provider';
import { supabase } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2, 
  ChevronRight,
  Zap,
  Activity,
  History
} from 'lucide-react';
import type { AssetRow } from "@/lib/types";
import { cn } from '@/lib/utils';
import { historyService } from '@/lib/services/history-service';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * INSTITUTIONAL CATEGORIZED ASSET LEDGER
 * Version: 4.0.0 (Tabbed Forensic Standard)
 */
export default function TransactionHistory({ token }: { token: AssetRow }) {
  const { user } = useUser();
  const router = useRouter();
  const { wallets, getAddressForChain, txRegistry } = useWallet();
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'in' | 'out' | 'fee'>('all');

  const isWnc = token?.symbol === 'WNC';
  const address = getAddressForChain(token?.chainId, wallets || []);

  useEffect(() => {
    if (!user?.id || !token?.symbol) return;

    const syncLocalHistory = async () => {
      setLoading(true);
      try {
        let results: any[] = [];
        
        // 1. Unified Registry Lookup (Real-time Indexed)
        if (address) {
            const tokenAddr = token.isNative ? 'native' : token.address?.toLowerCase();
            const registryKey = `${token.chainId}:${address.toLowerCase()}:${tokenAddr}`;
            const indexedTxs = txRegistry[registryKey] || [];
            
            if (indexedTxs.length > 0) {
                results = indexedTxs.map(tx => ({
                    ...tx,
                    peerName: tx.isOut ? tx.to : tx.from,
                }));
            }
        }

        // 2. Persistent Handshake (Fetch if registry is cold)
        if (results.length === 0) {
            if (isWnc) {
                const { data } = await supabase!
                    .from('wnc_transfers')
                    .select(`*, sender:sender_id (name), receiver:receiver_id (name)`)
                    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                    .order('created_at', { ascending: false })
                    .limit(50);
                
                if (data) {
                    results = data.map(tx => ({
                        id: tx.id,
                        amount: tx.amount_wnc || 0,
                        isOut: tx.sender_id === user.id,
                        peerName: tx.sender_id === user.id ? tx.receiver?.name : tx.sender?.name,
                        timestamp: tx.created_at,
                        type: tx.amount_wnc === 50 ? 'FEE' : 'transfer',
                        tx_hash: tx.id
                    }));
                }
            } else if (address) {
                // STRICT FILTERED FETCH
                const onChain = await historyService.fetchOnChainHistory(address, token.chainId, token.address);
                results = onChain.map(tx => ({
                    ...tx,
                    peerName: tx.isOut ? tx.to : tx.from,
                }));

                // Registry Fallback (Legacy)
                if (results.length === 0) {
                    const { data } = await supabase!
                        .from('transactions')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('chain_id', token.chainId) // STRICT CHAIN FILTER
                        .eq('token_address', token.isNative ? 'native' : token.address) // STRICT TOKEN FILTER
                        .order('timestamp', { ascending: false });
                    
                    if (data) {
                        results = data.map(tx => ({
                            ...tx,
                            isOut: tx.type === 'withdrawal' || tx.type === 'transfer_out',
                            peerName: 'Registry Node',
                        }));
                    }
                }
            }
        }

        setTransactions(results);
      } finally {
        setLoading(false);
      }
    };

    syncLocalHistory();
  }, [user?.id, token?.address, token?.chainId, token?.symbol, isWnc, address, txRegistry]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return transactions;
    if (activeTab === 'in') return transactions.filter(tx => !tx.isOut && tx.type !== 'FEE');
    if (activeTab === 'out') return transactions.filter(tx => tx.isOut && tx.type !== 'FEE');
    if (activeTab === 'fee') return transactions.filter(tx => tx.type === 'FEE');
    return transactions;
  }, [transactions, activeTab]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-20">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🕹️ FORENSIC NAVIGATION */}
      <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/5 rounded-2xl">
          <TabButton label="All" active={activeTab === 'all'} onClick={() => setActiveTab('all')} />
          <TabButton label="In" active={activeTab === 'in'} onClick={() => setActiveTab('in')} />
          <TabButton label="Out" active={activeTab === 'out'} onClick={() => setActiveTab('out')} />
          <TabButton label="Fees" active={activeTab === 'fee'} onClick={() => setActiveTab('fee')} />
      </div>

      <div className="divide-y divide-white/[0.03]">
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? filtered.map((tx, i) => {
            const isOut = tx.isOut;
            const isFee = tx.type === 'FEE';
            const peerLabel = tx.peerName?.startsWith('0x') 
              ? `${tx.peerName.slice(0, 4)}...${tx.peerName.slice(-4)}` 
              : tx.peerName || 'External Node';

            return (
              <motion.div 
                key={tx.id || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onClick={() => router.push(`/transactions/${tx.tx_hash || tx.id}`)}
                className="flex items-center justify-between py-4 group cursor-pointer active:bg-white/[0.01] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 shadow-lg",
                    isFee ? 'bg-primary/10 border-primary/20 text-primary' :
                    isOut ? 'bg-white/5 border-white/10 text-white/40' : 'bg-green-500/10 border-green-500/20 text-green-500'
                  )}>
                    {isFee ? <Zap className="w-5 h-5 fill-current" /> : isOut ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-black text-white uppercase tracking-tight">
                        {isFee ? 'Network Maintenance' : isOut ? `Dispatch to ${peerLabel}` : `Received from ${peerLabel}`}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                            {tx.timestamp ? formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true }) : 'Processing'}
                        </p>
                        {isFee && <span className="text-[7px] font-black bg-primary/10 text-primary px-1 rounded">SYSTEM</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className={cn(
                      "text-[13px] font-black tabular-nums tracking-tighter",
                      isFee ? 'text-primary' : isOut ? 'text-white' : 'text-green-500'
                    )}>
                      {isOut ? '-' : '+'}{parseFloat(tx.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </p>
                    <p className="text-[8px] font-bold text-white/10 uppercase tracking-tighter">
                      {token.symbol}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/5 group-hover:text-primary transition-colors" />
                </div>
              </motion.div>
            );
          }) : (
            <div className="py-24 text-center opacity-10 flex flex-col items-center gap-4">
              <History className="w-12 h-12" />
              <p className="text-[10px] font-black uppercase tracking-widest">No entries in this node</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                active ? "bg-white/10 text-white shadow-lg border border-white/5" : "text-white/20 hover:text-white/40"
            )}
        >
            {label}
        </button>
    );
}
