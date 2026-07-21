'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/contexts/user-provider';
import { supabase } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, Users, Network, Link as LinkIcon, Copy, TrendingUp, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export default function DesktopReferralsPage() {
  const { user, profile } = useUser();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const referralLink = typeof window !== 'undefined' && profile?.referral_code 
     ? `${window.location.origin}/register?ref=${profile.referral_code}` 
     : '';

  useEffect(() => {
    if (!user) return;
    const fetchReferrals = async () => {
      try {
        const { data, error } = await supabase
          .from('referrals')
          .select('*, referred:profiles!referred_id(name,email,created_at)')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data) setReferrals(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReferrals();

    const channel = supabase.channel('desktop-referrals-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals', filter: `referrer_id=eq.${user.id}` }, fetchReferrals)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const copyLink = () => {
     if (!referralLink) return;
     navigator.clipboard.writeText(referralLink);
     toast({ title: "Link Cloned", description: "Node URI copied to clipboard.", variant: "default" });
  };

  const filteredReferrals = referrals.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.referred?.name?.toLowerCase().includes(s) || r.referred?.email?.toLowerCase().includes(s);
  });

  const totalRewardsActive = referrals.filter(r => r.status === 'rewarded').length * 10; // example calc

  if (isLoading) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#633BBC]" /></div>;

  return (
    <div className="flex flex-col w-full h-full p-8 relative gap-8 overflow-hidden">
       {/* Background ambient glow */}
       <div className="absolute top-1/2 left-0 w-[800px] h-[800px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none -translate-y-1/2 -translate-x-1/2" />
       
       {/* HEADER & TOP WIDGETS */}
       <header className="w-full shrink-0 flex items-end justify-between z-10">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
               <Network className="w-8 h-8 text-emerald-500" /> Decentralized Network
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mt-1 ml-11">
               Alliance & Growth Hub
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Total Nodes Box */}
             <div className="px-6 py-3 rounded-2xl bg-black/40 border border-emerald-500/20 shadow-[0_4px_24px_rgba(16,185,129,0.1)] backdrop-blur-xl flex flex-col items-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1">Total Relays</p>
                 <p className="text-3xl font-black text-white">{referrals.length}</p>
             </div>
             
             {/* Reward Box */}
             <div className="px-6 py-3 rounded-2xl bg-black/40 border border-[#633BBC]/20 shadow-[0_4px_24px_rgba(99,59,188,0.1)] backdrop-blur-xl flex flex-col items-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-[#633BBC] mt-1">Network Yield</p>
                 <p className="text-3xl font-black text-white tabular-nums">${totalRewardsActive.toFixed(2)}</p>
             </div>
          </div>
       </header>

       {/* MAIN CONTENT SPLIT */}
       <div className="flex-1 flex gap-6 z-10 min-h-0">
          
          {/* LEFT: REFERRAL LINK DISPENSER */}
          <section className="w-1/3 h-full flex flex-col gap-6">
             <div className="w-full bg-black/60 border border-white/5 shadow-[0_4px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl rounded-[3rem] p-8 relative overflow-hidden group">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                
                <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner mb-6 group-hover:scale-110 transition-transform">
                   <LinkIcon className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Expansion URI</h2>
                <p className="text-[10px] font-bold text-white/50 tracking-widest leading-relaxed mb-8">
                   Propagate this node locator to earn perpetual yields from downstream escrow & swap volumes.
                </p>

                <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 group-hover:border-emerald-500/40 transition-colors">
                   <p className="text-xs font-mono text-emerald-500 truncate">{referralLink || 'Generating...'}</p>
                   <Button onClick={copyLink} className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-black uppercase tracking-widest text-[10px] text-[#050505] shadow-[0_0_20px_rgba(16,185,129,0.3)] mt-2">
                       <Copy className="w-4 h-4 mr-2" /> Clone URI
                   </Button>
                </div>
             </div>

             <div className="flex-1 bg-black/40 border border-white/5 shadow-2xl backdrop-blur-xl rounded-[3rem] p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#633BBC]/10 blur-[50px]" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#633BBC] mb-6 flex items-center gap-2">
                   <TrendingUp className="w-4 h-4" /> Yield Metrics
                </h3>
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-transparent hover:border-[#633BBC]/30 transition-colors">
                      <p className="text-xs font-bold text-white/60 tracking-widest">Active Downstream</p>
                      <p className="text-xl font-black text-white">{referrals.filter(r => r.status === 'rewarded').length}</p>
                   </div>
                   <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-transparent hover:border-[#633BBC]/30 transition-colors">
                      <p className="text-xs font-bold text-white/60 tracking-widest">Pending Verification</p>
                      <p className="text-xl font-black text-white">{referrals.filter(r => r.status === 'pending').length}</p>
                   </div>
                </div>
             </div>
          </section>

          {/* RIGHT: REAL-TIME TABLE */}
          <section className="w-2/3 h-full flex flex-col bg-black/60 border border-[#633BBC]/20 shadow-[0_4px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl rounded-[3rem] overflow-hidden">
             
             <div className="p-8 pb-6 shrink-0 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                   <Users className="w-5 h-5 text-[#633BBC]" />
                   <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Network Matrix</h2>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 hover:border-[#633BBC]/40 transition-colors focus-within:border-[#633BBC]/50 shadow-inner">
                   <Search className="w-4 h-4 text-[#633BBC]" />
                   <input 
                      type="text" 
                      placeholder="SEARCH IDENTIFIER..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-white placeholder:text-white/20 w-48" 
                   />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto thin-scrollbar p-6">
                <table className="w-full text-left">
                   <thead className="sticky top-0 bg-black/80 backdrop-blur-3xl z-10 border-b border-white/5">
                      <tr>
                         <th className="py-4 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-[#633BBC]">Node Alias</th>
                         <th className="py-4 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-[#633BBC]">Contact</th>
                         <th className="py-4 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-[#633BBC]">Initiated</th>
                         <th className="py-4 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-[#633BBC]">Status</th>
                      </tr>
                   </thead>
                   <tbody>
                      <AnimatePresence>
                         {filteredReferrals.map((r, i) => (
                           <motion.tr 
                              key={r.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-default"
                           >
                              <td className="py-5 px-4">
                                 <p className="text-sm font-black uppercase text-white tracking-tight">{r.referred?.name || 'Unknown Entity'}</p>
                              </td>
                              <td className="py-5 px-4">
                                 <p className="text-[10px] font-bold text-white/40 tracking-widest">{r.referred?.email || 'N/A'}</p>
                              </td>
                              <td className="py-5 px-4">
                                 <p className="text-[10px] font-bold text-white/40 tracking-widest">{formatDistanceToNow(new Date(r.created_at))} ago</p>
                              </td>
                              <td className="py-5 px-4">
                                 <div className={cn(
                                    "inline-flex items-center px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border",
                                    r.status === 'rewarded' ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/20" : "bg-amber-500/20 text-amber-500 border-amber-500/20"
                                 )}>
                                    {r.status || 'PENDING'}
                                 </div>
                              </td>
                           </motion.tr>
                         ))}
                      </AnimatePresence>
                   </tbody>
                </table>
                {filteredReferrals.length === 0 && (
                   <div className="w-full text-center py-20 flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                         <Users className="w-8 h-8" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-[#633BBC]">Zero Entities Found</p>
                   </div>
                )}
             </div>
          </section>
       </div>
    </div>
  );
}
