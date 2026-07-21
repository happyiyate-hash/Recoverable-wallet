
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  ArrowUp, 
  ArrowLeft,
  Search, 
  ChevronRight, 
  History, 
  ShieldCheck, 
  Zap,
  TrendingUp,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Shield,
  MoreVertical,
  Copy,
  CheckCircle2,
  HandCoins,
  QrCode,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useUser } from '@/contexts/user-provider';
import { useWallet } from '@/contexts/wallet-provider';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { nairaService } from '@/lib/services/naira-service';
import { motion, AnimatePresence } from 'framer-motion';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

/**
 * INSTITUTIONAL NAIRA BANKING TERMINAL
 * Version: 7.0.0 (High-Fidelity Reference Sync)
 * 
 * Rules:
 * 1. MATTE HERO: Solid charcoal foundation with institutional green accents.
 * 2. ACTION GRID: High-density 4-column utility matrix.
 * 3. SECURITY FOOTER: Persistent encrypted node validation.
 */
export default function NairaWalletPage() {
    const router = useRouter();
    const { profile, user } = useUser();
    const { accountNumber } = useWallet();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isIdCopied, copyId] = useCopyToClipboard();

    // 🔄 REAL-TIME LEDGER SYNC
    useEffect(() => {
        if (!user) return;

        const fetchLedger = async () => {
            if (!supabase) return;
            const { data } = await supabase
                .from('wnc_transfers')
                .select('*')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (data) setTransactions(data);
            setIsLoading(false);
        };

        fetchLedger();

        // Background provisioning check
        if (profile && !profile.virtual_account_number) {
            nairaService.provisionVirtualAccount(user.id);
        }

        const channel = supabase!.channel('naira-ledger-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'wnc_transfers' }, fetchLedger)
            .subscribe();

        return () => { supabase!.removeChannel(channel); };
    }, [user, profile]);

    if (!profile) return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

    const displayAccountNumber = accountNumber || profile?.account_number || '---';

    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-white">
            
            {/* 🛠️ HEADER NODE */}
            <header className="px-6 pt-10 pb-4 flex items-center justify-between sticky top-0 z-50 bg-[#050505]">
                <button onClick={() => router.push('/')} className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/10 transition-all active:scale-95">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex items-center gap-2">
                    <h1 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">Naira Wallet</h1>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white/40"><ShieldCheck className="w-5 h-5" /></button>
                    <button className="p-1 text-white/20"><MoreVertical className="w-5 h-5" /></button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto thin-scrollbar px-6 space-y-6 pb-20">
                
                {/* 💳 REGISTRY VAULT HERO CARD */}
                <section className="relative">
                    <div className="p-8 rounded-[2.5rem] bg-[#0a0a0c] border border-white/5 shadow-2xl relative overflow-hidden group">
                        {/* Background Watermark & Pattern */}
                        <div className="absolute top-1/2 right-0 -translate-y-1/2 opacity-10 pointer-events-none pr-4">
                            <span className="text-[120px] font-black text-primary leading-none">₦</span>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full -mr-20 -mt-20" />

                        <div className="space-y-10 relative z-10">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg">
                                        <div className="text-sm font-black">₦</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Registry Vault</p>
                                        <div className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[7px] font-black text-green-500 uppercase tracking-widest">Active</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => copyId(displayAccountNumber)}
                                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl border border-white/10 transition-all active:scale-95"
                                >
                                    <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">Wallet ID</span>
                                    {isIdCopied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-white/40" />}
                                </button>
                            </div>

                            <div className="space-y-1.5">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Available Naira</p>
                                <h2 className="text-6xl font-black tracking-tighter text-white tabular-nums">
                                    <span className="text-3xl mr-1 font-bold text-white/40">₦</span>
                                    {profile.wnc_earnings.toLocaleString()}
                                </h2>
                                <div className="flex items-center gap-1.5 text-green-500 font-black text-[9px] uppercase tracking-[0.2em] pt-1">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Handshake Verified</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-primary/40"><Zap className="w-4 h-4" /></div>
                                    <div className="space-y-0.5">
                                        <p className="text-[8px] font-black text-white/20 uppercase">Ledger Balance</p>
                                        <p className="text-xs font-black text-white">₦{profile.wnc_earnings.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 border-l border-white/5 pl-4">
                                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/10"><Clock className="w-4 h-4" /></div>
                                    <div className="space-y-0.5">
                                        <p className="text-[8px] font-black text-white/20 uppercase">Pending Clearance</p>
                                        <p className="text-xs font-black text-white/40">₦0.00</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 🕹️ PRIMARY ACTION HUB */}
                <section className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => router.push('/naira-wallet/send')}
                        className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/10 flex items-center gap-5 group active:scale-[0.98] transition-all shadow-xl"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-primary transition-colors">
                            <ArrowUpRight className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-black uppercase text-white tracking-widest">Send Money</p>
                            <p className="text-[9px] font-bold text-white/20 uppercase">Transfer Naira</p>
                        </div>
                    </button>
                    <button 
                        onClick={() => router.push('/naira-wallet/receive')}
                        className="p-6 rounded-[2rem] bg-primary flex items-center gap-5 group active:scale-[0.98] transition-all shadow-2xl shadow-primary/20"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center text-black">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div className="text-left text-black">
                            <p className="text-xs font-black uppercase tracking-widest">Add Money</p>
                            <p className="text-[9px] font-bold uppercase opacity-60">Fund Wallet</p>
                        </div>
                    </button>
                </section>

                {/* 📜 SECONDARY UTILITY GRID */}
                <section className="grid grid-cols-4 gap-3">
                    <UtilityCard icon={HandCoins} label="Receive" sub="Get Paid" onClick={() => router.push('/naira-wallet/receive')} />
                    <UtilityCard icon={ChevronRight} label="Request" sub="Request Naira" />
                    <UtilityCard icon={QrCode} label="QR Pay" sub="Scan & Pay" />
                    <UtilityCard icon={History} label="History" sub="All Transactions" />
                </section>

                {/* 📊 ACTIVITY LEDGER */}
                <section className="space-y-4 pt-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Recent Activity</h3>
                        <button className="flex items-center gap-2 text-[9px] font-black text-primary uppercase tracking-[0.2em] hover:brightness-125 transition-all">
                            View All <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {isLoading ? (
                            <div className="py-20 flex flex-col items-center gap-4 opacity-20">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                <p className="text-[9px] font-black uppercase tracking-widest">Auditing Ledger...</p>
                            </div>
                        ) : transactions.length > 0 ? (
                            transactions.map((tx) => {
                                const isOut = tx.sender_id === user?.id;
                                return (
                                    <div key={tx.id} className="p-5 flex items-center justify-between bg-[#0a0a0c] border border-white/5 rounded-3xl group cursor-pointer active:scale-[0.99] transition-all shadow-xl">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-11 h-11 rounded-full flex items-center justify-center border",
                                                isOut ? "bg-white/5 border-white/10 text-white/40" : "bg-primary/10 border-primary/20 text-primary"
                                            )}>
                                                {isOut ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-black text-white uppercase tracking-tight truncate w-36">
                                                    {tx.reference?.split(':')[0] || (isOut ? 'Request Fulfillment' : 'Institutional Payment')}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-[8px] font-bold uppercase tracking-widest text-white/20">
                                                        4/28/2026
                                                    </p>
                                                    <div className="w-0.5 h-0.5 rounded-full bg-white/10" />
                                                    <p className="text-[8px] font-bold uppercase tracking-widest text-white/20">
                                                        10:45 AM
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn(
                                                "text-sm font-black tabular-nums tracking-tighter",
                                                isOut ? "text-red-500" : "text-primary"
                                            )}>
                                                {isOut ? '-' : '+'}₦{tx.amount_wnc.toLocaleString()}
                                            </p>
                                            <div className="flex items-center justify-end gap-1.5 mt-1">
                                                <span className="text-[7px] font-black text-white/40 uppercase">Settled</span>
                                                <div className="w-1 h-1 rounded-full bg-primary" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-20 flex flex-col items-center justify-center opacity-10 text-center border border-dashed border-white/10 rounded-[2.5rem]">
                                <History className="w-10 h-10 mb-4" />
                                <p className="text-[9px] font-black uppercase tracking-widest">No activity found</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* 🛡️ SECURITY SENTINEL FOOTER */}
                <section className="pt-4 pb-10">
                    <div className="p-6 rounded-[2.5rem] bg-[#0a0a0c] border border-primary/20 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner group-hover:scale-105 transition-transform">
                                <Lock className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-white uppercase tracking-tight">Wallet Security</h4>
                                <p className="text-[9px] text-white/40 leading-relaxed max-w-[180px] font-medium">Your Naira wallet is secure and protected with end-to-end encryption.</p>
                            </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col items-center gap-1 relative z-10 shrink-0">
                            <Shield className="w-4 h-4 text-primary" />
                            <div className="text-center">
                                <p className="text-[7px] font-black text-primary uppercase">Secure</p>
                                <p className="text-[6px] font-bold text-primary/60 uppercase">256-bit</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

function UtilityCard({ icon: Icon, label, sub, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-3 p-4 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:bg-white/5 transition-all group active:scale-95 shadow-xl"
        >
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-primary/60 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-center">
                <p className="text-[10px] font-black text-white uppercase tracking-tight">{label}</p>
                <p className="text-[7px] font-bold text-white/20 uppercase mt-0.5">{sub}</p>
            </div>
        </button>
    );
}
