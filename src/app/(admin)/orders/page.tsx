'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  ShieldAlert, 
  Loader2,
  Filter,
  DollarSign,
  Vault,
  ShieldCheck,
  Zap,
  Clock
} from 'lucide-react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { EscrowTrade } from '@/lib/services/escrow-service';

/**
 * INSTITUTIONAL ESCROW LEDGER (ADMIN)
 * Version: 4.0.0 (Request & Trade Full Pipeline)
 * 
 * Monitors both escrow_requests and escrow_trades for a complete audit trail.
 */
export default function AdminOrdersPage() {
  const [trades, setTrades] = useState<EscrowTrade[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'trades' | 'requests'>('trades');

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const [tradesRes, requestsRes] = await Promise.all([
        supabase
          .from('escrow_trades')
          .select(`
            *,
            buyer:profiles!buyer_id(name, email, photo_url),
            seller:profiles!seller_id(name, email, photo_url),
            listing:listing_id(*)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('escrow_requests')
          .select(`
            *,
            requester:requester_id(name, email, photo_url),
            receiver:receiver_id(name, email, photo_url)
          `)
          .order('created_at', { ascending: false })
      ]);

      if (tradesRes.error) throw tradesRes.error;
      if (requestsRes.error) throw requestsRes.error;

      setTrades(tradesRes.data as any[]);
      setRequests(requestsRes.data || []);
    } catch (e) {
      console.error("[LEDGER_SYNC_FAIL]", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    const channel = supabase?.channel('escrow-master-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escrow_trades' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escrow_requests' }, () => fetchData())
      .subscribe();

    return () => { supabase?.removeChannel(channel!); };
  }, [fetchData]);

  const filteredTrades = trades.filter(t => 
    t.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.buyer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.seller?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRequests = requests.filter(r => 
    r.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.requester?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.receiver?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-10 overflow-y-auto thin-scrollbar h-full">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            Escrow Ledger
          </h1>
          <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em] mt-1">Full Transaction Pipeline</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
            <Input 
              placeholder="Search Ledger..." 
              className="bg-white/5 border-white/10 rounded-xl pl-11 h-12 text-xs focus-visible:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
            <button 
              onClick={() => setActiveView('trades')}
              className={cn(
                "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                activeView === 'trades' ? "bg-primary text-black" : "text-white/40 hover:text-white"
              )}
            >
              Trades
            </button>
            <button 
              onClick={() => setActiveView('requests')}
              className={cn(
                "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                activeView === 'requests' ? "bg-primary text-black" : "text-white/40 hover:text-white"
              )}
            >
              Requests
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        {activeView === 'trades' ? (
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Trade Node</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Identity Pair</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4 text-center">Registry Vault</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Status</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4 text-right">Last Sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-white/5">
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-24"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary opacity-40" /></TableCell></TableRow>
              ) : filteredTrades.length > 0 ? (
                filteredTrades.map((trade) => (
                  <TableRow key={trade.id} className="border-white/5 hover:bg-white/[0.01] transition-colors group cursor-pointer">
                    <TableCell className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary/60 shadow-lg"><Vault className="w-5 h-5" /></div>
                        <div>
                          <p className="font-black text-sm text-white uppercase tracking-tight truncate max-w-[180px]">{trade.listing?.description || `Trade #${trade.id.slice(0, 8)}`}</p>
                          <p className="text-[8px] font-mono text-white/20 uppercase tracking-widest mt-0.5">ID: {trade.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-white/60 uppercase truncate w-24">@{trade.buyer?.name}</p>
                          <p className="text-[7px] text-white/20 font-bold uppercase">Payer</p>
                        </div>
                        <ArrowRight className="w-3 h-3 text-primary opacity-20" />
                        <div className="text-left">
                          <p className="text-[10px] font-black text-white/60 uppercase truncate w-24">@{trade.seller?.name}</p>
                          <p className="text-[7px] text-white/20 font-bold uppercase">Payee</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-white tabular-nums">{trade.escrow_balance?.toLocaleString()} <span className="text-[10px] text-primary">WNC</span></span>
                        <span className="text-[7px] font-bold text-white/20 uppercase">Held in Registry</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md", {
                        'bg-green-500/10 border-green-500/20 text-green-400': trade.status === 'COMPLETED',
                        'bg-amber-500/10 border-amber-500/20 text-amber-400': trade.status === 'FUNDED' || trade.status === 'DELIVERING',
                        'bg-red-500/10 border-red-500/20 text-red-400': trade.status === 'DISPUTED',
                        'bg-white/5 border-white/10 text-white/40': trade.status === 'PENDING'
                      })}>{trade.status.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-white/20 uppercase">{new Date(trade.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-[8px] font-black text-primary/40 uppercase tracking-widest">Handshake Verified</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="text-center py-32 opacity-20"><ShieldCheck className="mx-auto h-12 w-12 mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Ledger Clear</p></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Request Node</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Identity Handshake</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4 text-center">Amount</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Status</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4 text-right">Initiated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-white/5">
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-24"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary opacity-40" /></TableCell></TableRow>
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <TableRow key={req.id} className="border-white/5 hover:bg-white/[0.01] transition-colors group cursor-default">
                    <TableCell className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary/60 shadow-lg"><Clock className="w-5 h-5" /></div>
                        <div>
                          <p className="font-black text-sm text-white uppercase tracking-tight truncate max-w-[180px]">{req.description || 'P2P Handshake'}</p>
                          <p className="text-[8px] font-mono text-white/20 uppercase tracking-widest mt-0.5">UID: {req.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-white/60 uppercase truncate w-24">@{req.requester?.name}</p>
                          <p className="text-[7px] text-white/20 font-bold uppercase">From</p>
                        </div>
                        <ArrowRight className="w-3 h-3 text-primary opacity-20" />
                        <div className="text-left">
                          <p className="text-[10px] font-black text-white/60 uppercase truncate w-24">@{req.receiver?.name}</p>
                          <p className="text-[7px] text-white/20 font-bold uppercase">Target</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-center">
                      <span className="text-sm font-black text-white tabular-nums">{req.amount?.toLocaleString()} <span className="text-[10px] text-primary">WNC</span></span>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md", 
                        req.status === 'pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-white/5 border-white/10 text-white/40"
                      )}>{req.status}</Badge>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-right">
                      <span className="text-[10px] font-bold text-white/20 uppercase">{new Date(req.created_at).toLocaleDateString()}</span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="text-center py-32 opacity-20"><Zap className="mx-auto h-12 w-12 mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">No Active Requests</p></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <footer className="pt-10 flex flex-col items-center gap-3 opacity-20 pb-10">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
            <ShieldCheck className="w-3 h-3 text-primary" />
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Master Settlement Registry v4.0</span>
        </div>
      </footer>
    </div>
  );
}
