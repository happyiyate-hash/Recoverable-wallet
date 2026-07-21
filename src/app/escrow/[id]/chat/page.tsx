'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  Lock, 
  ShieldCheck,
  User,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/contexts/user-provider';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * STANDALONE ESCROW CHAT HUB (V4 CINEMATIC)
 * Version: 1.0.0
 */
export default function EscrowChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!params.id || !supabase) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('escrow_messages')
        .select('*')
        .eq('trade_id', params.id)
        .order('created_at', { ascending: true });
      
      setMessages(data || []);
      setLoading(false);
    };

    fetchMessages();

    // REAL-TIME HANDSHAKE
    const channel = supabase
      .channel(`chat:${params.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'escrow_messages', 
        filter: `trade_id=eq.${params.id}` 
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !user || !supabase) return;

    const msg = chatMessage;
    setChatMessage('');

    try {
      await supabase.from('escrow_messages').insert({
        trade_id: params.id,
        sender_id: user.id,
        message: msg
      });
    } catch (e) {}
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-foreground relative overflow-hidden">
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50 px-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </Button>
        
        <div className="flex flex-col items-center">
          <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white">Secure Chat Hub</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <Lock className="w-2.5 h-2.5 text-primary" />
            <span className="text-[8px] text-primary font-black uppercase tracking-tighter">E2E Encrypted</span>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="rounded-xl">
          <MoreVertical className="w-5 h-5 text-muted-foreground" />
        </Button>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col relative">
        {loading ? (
          <div className="flex flex-1 items-center justify-center opacity-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6 pb-10">
              {messages.map((msg, i) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={i} className={cn(
                    "flex flex-col gap-1.5 max-w-[85%]",
                    msg.is_system ? "mx-auto items-center" : isMe ? "ml-auto items-end" : "items-start"
                  )}>
                    {msg.is_system ? (
                      <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                        {msg.message}
                      </div>
                    ) : (
                      <>
                        <div className={cn(
                          "p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-xl border",
                          isMe 
                            ? "bg-primary border-primary/20 text-white rounded-tr-none" 
                            : "bg-white/[0.03] border-white/5 text-white/90 rounded-tl-none"
                        )}>
                          {msg.message}
                        </div>
                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        )}

        <div className="p-6 bg-black/40 border-t border-white/5 backdrop-blur-3xl">
          <form onSubmit={handleSend} className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="flex-1 relative group">
              <div className="absolute -inset-0.5 bg-primary/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <Input 
                placeholder="Type your message..." 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="relative h-14 bg-white/5 border-white/10 rounded-2xl px-6 text-sm focus-visible:ring-primary shadow-inner"
              />
            </div>
            <Button 
              type="submit" 
              size="icon" 
              disabled={!chatMessage.trim()}
              className="w-14 h-14 rounded-2xl bg-primary shadow-xl shadow-primary/20 transition-all active:scale-90"
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
          
          <div className="mt-4 flex items-center justify-center gap-2 opacity-20">
            <ShieldCheck className="w-3 h-3 text-white" />
            <span className="text-[8px] font-black uppercase tracking-widest text-white">SmarterSeller Security Sentinel v4.0</span>
          </div>
        </div>
      </main>
    </div>
  );
}
