'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Lock, 
  CheckCircle2, 
  Send,
  ShieldCheck,
  Zap,
  DollarSign,
  Clock,
  Loader2,
  ArrowLeft,
  History,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface Props {
  tradeId: string;
  currentUserId: string;
}

export default function BuyerEscrow({ tradeId, currentUserId }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [trade, setTrade] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<any>(null);

  /**
   * FULL REGISTRY RE-FETCH
   * Version: 2.0.0 (Recursive Join Standard)
   * Fetches full trade node with participant profile data.
   */
  const fetchFullTrade = useCallback(async () => {
    if (!supabase || !tradeId) return;
    const { data } = await supabase
      .from('escrow_trades')
      .select(`
        *,
        seller:profiles!escrow_trades_seller_fkey(name, photo_url, avatar_url),
        buyer:profiles!escrow_trades_buyer_fkey(name, photo_url, avatar_url)
      `)
      .eq('id', tradeId)
      .single();

    if (data) setTrade(data);
  }, [tradeId]);

  // Initial Hydration
  useEffect(() => {
    fetchFullTrade();
    
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('escrow_messages')
        .select('*')
        .eq('trade_id', tradeId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();
  }, [tradeId, fetchFullTrade]);

  /**
   * UNIFIED REAL-TIME HUB
   */
  useEffect(() => {
    if (!tradeId) return;

    const channel = supabase.channel(`escrow-sync-${tradeId}`);

    channel
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'escrow_trades', 
        filter: `id=eq.${tradeId}` 
      }, () => {
        // ✅ ALWAYS RE-FETCH FULL NODE ON CHANGE
        fetchFullTrade();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'escrow_messages', 
        filter: `trade_id=eq.${tradeId}` 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages((prev) => [...prev, payload.new]);
        } else if (payload.eventType === 'DELETE') {
          setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.user !== currentUserId) {
          setTypingUser(payload.payload.userName || 'Seller');
          const timer = setTimeout(() => setTypingUser(null), 3000);
          return () => clearTimeout(timer);
        }
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => { supabase.removeChannel(channel); };
  }, [tradeId, currentUserId, fetchFullTrade]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendTypingSignal = async () => {
    if (!typingChannelRef.current) return;
    await typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user: currentUserId, userName: 'Buyer' }
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    
    await supabase.from('escrow_messages').insert({
      trade_id: tradeId,
      sender_id: currentUserId,
      message: msg,
      is_system: false
    });
  };

  const handleAction = async (action: 'fund' | 'approve' | 'dispute') => {
    setIsProcessing(true);
    try {
      if (action === 'fund') {
        const { data, error } = await supabase.rpc('fund_escrow', {
          p_trade_id: tradeId,
          p_buyer_id: currentUserId
        });
        if (error) throw error;
        if (data && !data.success) throw new Error(data.message);
      } 
      else if (action === 'approve') {
        const { data, error } = await supabase.rpc('approve_escrow', {
          p_trade_id: tradeId,
          p_buyer_id: currentUserId
        });
        if (error) throw error;
        if (data && !data.success) throw new Error(data.message);
      }
      else {
        await supabase.from('escrow_trades').update({ status: 'DISPUTED' }).eq('id', tradeId);
      }
      toast({ title: "Registry Updated" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Action Denied", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!trade) return null;

  const status = trade.status;
  const transactionId = `#SEC-${trade.id.slice(0, 5).toUpperCase()}`;
  const usdValue = (trade.escrow_balance || 0) * 0.01;
  
  const steps = [
    { label: 'AGR', icon: CheckCircle2 },
    { label: 'FUND', icon: DollarSign },
    { label: 'WORK', icon: Zap },
    { label: 'INSP', icon: Clock },
    { label: 'SETT', icon: ShieldCheck }
  ];

  const getStepState = (index: number) => {
    const states = ['PENDING', 'FUNDED', 'DELIVERING', 'DELIVERING', 'COMPLETED'];
    const currentIdx = states.indexOf(status);
    if (status === 'COMPLETED') return 'done';
    if (index < currentIdx) return 'done';
    if (index === currentIdx) return 'current';
    return 'pending';
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white overflow-hidden">
      <header className="flex items-center h-10 shrink-0 bg-black/40 border-b border-white/5 backdrop-blur-xl relative">
        <button onClick={() => router.back()} className="absolute left-3 p-1 hover:bg-white/5 rounded-md transition-colors">
          <ArrowLeft className="w-4 h-4 text-white/40" />
        </button>
        <div className="mx-auto flex items-center gap-2">
          <Lock className="w-3 h-3 text-primary" />
          <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">BUYER TERMINAL</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto thin-scrollbar p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between px-1 shrink-0">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 rounded-full border border-white/10">
              <AvatarImage src={trade.seller?.photo_url || trade.seller?.avatar_url} />
              <AvatarFallback className="text-[10px] font-black bg-primary/20 text-primary">S</AvatarFallback>
            </Avatar>
            <div className="leading-none pl-1">
              <p className="text-[11px] font-black text-white uppercase tracking-tight">@{trade.seller?.name || 'Seller'}</p>
              <p className="text-[8px] text-white/30 font-mono mt-0.5 tracking-widest">{transactionId}</p>
            </div>
          </div>
          <div className={cn(
            "px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest",
            status === 'DISPUTED' ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-primary/5 border-primary/20 text-primary"
          )}>
            {status}
          </div>
        </div>

        <section className="p-4 rounded-xl bg-white/[0.02] border border-white/5 relative overflow-hidden shrink-0">
          <div className="flex justify-between items-center relative px-2">
            {steps.map((step, i) => {
              const state = getStepState(i);
              return (
                <div key={i} className="flex flex-col items-center gap-1.5 relative z-10">
                  <div className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center transition-all duration-500",
                    state === 'done' ? "bg-primary text-black" : 
                    state === 'current' ? "bg-black border border-primary text-primary shadow-[0_0_15px_rgba(245,158,11,0.3)]" :
                    "bg-black border border-white/10 text-white/10"
                  )}>
                    <step.icon className="w-3 h-3" />
                  </div>
                  <span className={cn("text-[7px] font-black tracking-widest", state !== 'pending' ? "text-white/60" : "text-white/10")}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 💰 SLIM VALUATION CARD */}
        <section className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 shadow-xl shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[8px] font-black text-primary uppercase tracking-widest">Locked Registry Balance</p>
              <h3 className="text-xl font-black text-white tabular-nums tracking-tighter">{trade.escrow_balance?.toLocaleString() || 0} WNC</h3>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">USD Value</p>
              <p className="text-xs font-bold text-white/80 tabular-nums">${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </section>

        <section className="flex-1 flex flex-col min-h-0 bg-white/[0.01] rounded-xl border border-white/5 overflow-hidden">
          <div className="p-2 border-b border-white/5 bg-black/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 opacity-40">
              <History className="w-3 h-3 text-primary" />
              <p className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Audit Thread</p>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {messages.map((msg, i) => {
                const isYou = msg.sender_id === currentUserId;
                return (
                  <div key={i} className={cn("flex flex-col gap-1", isYou ? "items-end" : "items-start")}>
                    <div className={cn(
                      "p-3 rounded-md text-[11px] leading-relaxed max-w-[85%] border",
                      isYou ? "bg-primary/10 border-primary/20 text-white" : "bg-white/[0.02] border-white/5 text-white/80"
                    )}>
                      {msg.message}
                    </div>
                    <span className="text-[7px] font-black uppercase text-white/10 tracking-widest px-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              {typingUser && (
                <div className="flex items-center gap-2 px-1 animate-pulse">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <p className="text-[8px] font-black text-primary uppercase tracking-widest">{typingUser} is typing...</p>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <form onSubmit={handleSend} className="p-3 bg-black/40 border-t border-white/5 shrink-0">
            <div className="relative group">
              <Input 
                placeholder="Log activity to registry..." 
                value={chatInput} 
                onChange={(e) => {
                  setChatInput(e.target.value);
                  sendTypingSignal();
                }}
                className="h-9 bg-white/5 border-white/10 rounded-md px-3 text-[11px] focus-visible:ring-primary shadow-inner placeholder:text-white/10"
              />
              <button type="submit" disabled={!chatInput.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </section>
      </main>

      <footer className="p-4 bg-black/60 border-t border-white/5 backdrop-blur-2xl shrink-0">
        <div className="flex items-center justify-end max-w-md mx-auto">
          <div className="flex gap-2">
            {status === 'PENDING' && (
              <Button 
                disabled={isProcessing}
                onClick={() => handleAction('fund')}
                className="h-10 px-5 rounded-md bg-primary hover:bg-primary/90 text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'FUND ESCROW'}
              </Button>
            )}
            {status === 'DELIVERING' && (
              <Button 
                disabled={isProcessing}
                onClick={() => handleAction('approve')}
                className="h-10 px-5 rounded-md bg-green-500 hover:bg-green-600 text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'RELEASE FUNDS'}
              </Button>
            )}
            {(status === 'FUNDED' || status === 'DELIVERING') && (
              <Button 
                variant="ghost" 
                disabled={isProcessing}
                onClick={() => handleAction('dispute')}
                className="h-10 px-4 rounded-md border border-red-500/20 text-red-500 text-[10px] font-black uppercase hover:bg-red-500/10"
              >
                DISPUTE
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
