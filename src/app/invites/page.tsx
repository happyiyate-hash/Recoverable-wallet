'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Users, 
  Zap, 
  ShieldCheck, 
  Copy, 
  CheckCircle2, 
  Share2, 
  Clock, 
  Fingerprint,
  Cpu,
  Loader2,
  User as UserIcon,
  HandCoins,
  AlertCircle,
  Lock,
  Activity,
  Ticket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/user-provider';
import { useWallet } from '@/contexts/wallet-provider';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { Referral } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function InvitesPage() {
    const router = useRouter();
    const { user, profile, refreshProfile } = useUser();
    const [isCopied, copy] = useCopyToClipboard();
    const { toast } = useToast();
    
    const [currentStep, setCurrentStep] = useState(0);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    // DUAL WALLET CALCULATION
    const { escrowBalance, authorizedCount } = useMemo(() => {
        const escrow = referrals.reduce((sum, r) => sum + (r.status === 'pending' ? 100 : 0), 0);
        const authorized = referrals.filter(r => r.status === 'completed').length;
        return { escrowBalance: escrow, authorizedCount: authorized };
    }, [referrals]);

    const referralCode = profile?.referral_code || '------';
    const shareUrl = useMemo(() => {
        if (typeof window === 'undefined' || !referralCode || referralCode === '------') return '';
        return `${window.location.origin}/auth/signup?ref=${referralCode}`;
    }, [referralCode]);

    const fetchReferrals = async () => {
        if (!user?.id || !supabase) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('referrals')
                .select(`
                    *,
                    referred:referred_user_id (
                        name,
                        email,
                        photo_url
                    )
                `)
                .eq('referrer_id', user.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setReferrals(data as Referral[]);
            }
        } catch (e) {
            console.error("Referral fetch error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReferrals();
    }, [user?.id]);

    const handleWithdraw = async () => {
        if (isWithdrawing || authorizedCount === 0) return;
        
        setIsWithdrawing(true);
        try {
            const { data, error } = await supabase!.rpc('withdraw_referral_bonus', {
                p_user_id: user?.id
            });

            if (error) throw error;
            
            toast({ title: "Settlement Authorized", description: `Transferred yields to your main vault.` });
            await refreshProfile();
            await fetchReferrals();
        } catch (e: any) {
            toast({ variant: "destructive", title: "Protocol Error", description: e.message });
        } finally {
            setIsWithdrawing(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % 4);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const scenes = [
        { title: "Broadcast Identity", desc: "Share your unique Node Invitation with prospective registry members.", icon: Share2, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        { title: "Registry Activity", desc: "Referred users must complete 4 WNC transfers to authorize rewards.", icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
        { title: "Escrow Protocol", desc: "Earnings are held in a secure growth escrow until activity verification.", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        { title: "Registry Settlement", desc: "Claim your 100 WNC rewards once the milestone handshake is met.", icon: Zap, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-transparent text-foreground overflow-hidden">
            <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50 px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Button>
                <div className="flex flex-col items-center text-center">
                    <h1 className="text-xs font-black uppercase tracking-[0.2em] leading-none text-white/90">Affiliate Hub</h1>
                    <div className="flex items-center gap-1.5 mt-1.5"><Users className="w-2.5 h-2.5 text-primary" /><span className="text-[8px] text-primary font-black uppercase tracking-tighter">Growth Registry</span></div>
                </div>
                <div className="w-10" />
            </header>

            <main className="flex-1 p-6 flex flex-col gap-8 max-w-lg mx-auto w-full pb-32 overflow-y-auto thin-scrollbar">
                <section className="relative h-[280px] w-full shrink-0 rounded-[3rem] bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black/80 z-0" />
                    <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 text-center">
                        <AnimatePresence mode="wait">
                            <motion.div key={currentStep} initial={{ y: 20, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0, scale: 0.9 }} transition={{ type: 'spring', damping: 20 }} className="space-y-6">
                                <div className={cn("w-20 h-20 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl transition-all duration-1000", scenes[currentStep].bg, scenes[currentStep].border, scenes[currentStep].color)}>
                                    {(() => { const Icon = scenes[currentStep].icon; return <Icon className="w-10 h-10" />; })()}
                                </div>
                                <div className="space-y-2 px-4"><h2 className="text-xl font-black uppercase tracking-tight text-white">{scenes[currentStep].title}</h2><p className="text-xs text-muted-foreground leading-relaxed font-medium">{scenes[currentStep].desc}</p></div>
                            </motion.div>
                        </AnimatePresence>
                        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
                            {scenes.map((_, i) => ( <div key={i} className={cn("h-1 transition-all duration-500 rounded-full", currentStep === i ? "w-8 bg-primary" : "w-2 bg-white/10")} /> ))}
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-2 gap-3 shrink-0">
                    <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/5 space-y-1 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/20" />
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Growth Escrow</p>
                        <p className="text-2xl font-black text-white tabular-nums">{escrowBalance.toLocaleString()}</p>
                        <p className="text-[7px] font-black text-amber-500 uppercase tracking-tighter">Waiting for Activity</p>
                    </div>
                    <div className="p-6 rounded-[2.5rem] bg-primary/5 border border-primary/20 space-y-1 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 blur-2xl -mr-8 -mt-8" />
                        <p className="text-[9px] font-black text-primary uppercase tracking-widest">Settled</p>
                        <p className={cn("text-2xl font-black tabular-nums", authorizedCount > 0 ? "text-green-400" : "text-white/40")}>{(authorizedCount * 100).toLocaleString()}</p>
                        <div className="flex items-center gap-1"><span className="text-[7px] font-black text-primary uppercase tracking-tighter">{authorizedCount} Authorized Nodes</span></div>
                    </div>
                </div>

                <section className="px-2">
                    <Button 
                        onClick={handleWithdraw} 
                        disabled={isWithdrawing || authorizedCount === 0} 
                        className={cn(
                            "w-full h-16 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all shadow-2xl group", 
                            authorizedCount > 0 
                                ? "bg-gradient-to-r from-primary via-purple-600 to-primary/80 hover:brightness-110 shadow-primary/20 border-b-4 border-purple-800" 
                                : "bg-zinc-900 border-zinc-950 hover:bg-zinc-800"
                        )}
                    >
                        {isWithdrawing ? <Loader2 className="animate-spin w-5 h-5" /> : ( 
                            <div className="flex items-center gap-3">
                                {authorizedCount > 0 ? <HandCoins className="w-5 h-5 animate-pulse" /> : <Lock className="w-4 h-4 opacity-40" />}
                                <span>{authorizedCount > 0 ? "Authorize Settlement" : "Registry Standby"}</span>
                            </div> 
                        )}
                    </Button>
                </section>

                <section className="space-y-4 shrink-0">
                    <div className="flex justify-between items-center px-2"><p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Node ID & Invitation</p><div className="flex items-center gap-1.5 text-[8px] font-black text-green-500 uppercase"><Cpu className="w-2.5 h-2.5 animate-pulse" /> Registry: Immutable</div></div>
                    <div className="p-6 rounded-[2.5rem] bg-black/40 backdrop-blur-xl border border-white/10 space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16" />
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest px-1">Your Invitation Code</p>
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                                <p className="text-2xl font-mono font-black text-primary tracking-[0.2em]">{referralCode}</p>
                                <button onClick={() => copy(referralCode)} className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", isCopied ? "bg-green-500 text-white" : "bg-white/5 text-muted-foreground hover:text-white")}>{isCopied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}</button>
                            </div>
                        </div>
                        <Button onClick={() => navigator.share({ title: 'Join Node Quick Registry', url: shareUrl })} className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">Broadcast Invitation</Button>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex justify-between items-center px-2"><p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Institutional Referrals</p><span className="text-[8px] font-black text-white/20 uppercase">Growth Registry v5.0</span></div>
                    <div className="space-y-2">
                        {isLoading ? ( <div className="flex flex-col items-center py-10 gap-3 opacity-20"><Loader2 className="w-6 h-6 animate-spin" /><p className="text-[10px] font-black uppercase tracking-widest">Synchronizing Nodes...</p></div> ) : referrals.length > 0 ? ( referrals.map((ref, i) => {
                                const progress = ref.total_transfers || 0;
                                return (
                                <motion.div key={ref.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all shadow-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Avatar className="w-12 h-12 rounded-2xl border border-white/10"><AvatarImage src={ref.referred?.photo_url} /><AvatarFallback className="bg-zinc-900 text-primary"><UserIcon className="w-5 h-5" /></AvatarFallback></Avatar>
                                            <div className={cn("absolute -bottom-1 -right-1 rounded-full p-0.5 border-2 border-[#050505] shadow-lg", ref.status === 'completed' ? "bg-green-500" : "bg-amber-500")}>{ref.status === 'completed' ? <CheckCircle2 className="w-2.5 h-2.5 text-white" /> : <Clock className="w-2.5 h-2.5 text-white" />}</div>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-sm text-white tracking-tight">@{ref.referred?.name || 'Anonymous Node'}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={cn("text-[8px] font-black uppercase tracking-widest", progress >= 4 ? "text-green-500" : "text-amber-500")}>
                                                    {progress >= 4 ? 'Handshake Met' : `${progress}/4 Transfers`}
                                                </span>
                                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                                <span className="text-[8px] font-black uppercase text-white/30">{new Date(ref.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest", ref.status === 'completed' ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500")}>{ref.status}</div>
                                        <p className="text-[10px] font-black text-white tabular-nums">{ref.status === 'completed' ? '+100 WNC' : 'Escrow Node'}</p>
                                    </div>
                                </motion.div> )}) ) : ( <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 opacity-30"><div className="w-16 h-16 rounded-[2rem] bg-white/5 border border-dashed border-white/10 flex items-center justify-center"><Users className="w-8 h-8 text-white" /></div><div className="space-y-1"><p className="text-xs font-black uppercase tracking-widest text-white">No nodes detected</p><p className="text-[9px] font-medium leading-relaxed max-w-[180px] mx-auto">Broadcast your invitation to expand your institutional registry.</p></div></div> )}
                    </div>
                </section>
            </main>
        </div>
    );
}
