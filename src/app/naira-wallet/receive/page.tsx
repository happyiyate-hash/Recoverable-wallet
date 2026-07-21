'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  AtSign, 
  Send, 
  Hash, 
  CreditCard, 
  Banknote,
  ChevronRight,
  ShieldCheck,
  Copy,
  CheckCircle2,
  QrCode,
  ArrowLeft,
  Building2,
  UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/user-provider';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * INSTITUTIONAL FUNDING HUB (ADD MONEY)
 * Version: 6.0.0 (Bank Registry Integration)
 */
export default function NairaReceivePage() {
    const router = useRouter();
    const { profile } = useUser();
    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        toast({ title: "Copied to Clipboard" });
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-white">
            <header className="p-6 flex items-center justify-between sticky top-0 bg-black/40 backdrop-blur-2xl z-50 border-b border-white/5">
                <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xs font-black uppercase tracking-[0.3em] leading-none text-white/90">Add Money</h1>
                    <span className="text-[8px] text-primary font-bold uppercase mt-1">Registry Funding</span>
                </div>
                <div className="w-10" />
            </header>

            <main className="flex-1 p-6 space-y-10 overflow-y-auto thin-scrollbar max-w-lg mx-auto w-full pb-20">
                
                {/* 🏦 VIRTUAL ACCOUNT CARD */}
                <section className="space-y-4">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Dedicated Virtual Account</p>
                    <div className="p-8 rounded-[3rem] bg-gradient-to-br from-primary/10 via-primary/5 to-black border border-primary/20 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-10 -mt-10" />
                        
                        <div className="space-y-6 relative z-10">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">WNC Settlement Node</p>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{profile?.virtual_bank_name || 'Providus Bank'}</h3>
                                </div>
                                <Building2 className="w-6 h-6 text-primary/40 group-hover:scale-110 transition-transform" />
                            </div>

                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Account Number</p>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-4xl font-black text-white tracking-[0.1em] font-mono tabular-nums">
                                        {profile?.virtual_account_number || '0000000000'}
                                    </h2>
                                    <button 
                                        onClick={() => handleCopy(profile?.virtual_account_number || '0000000000')}
                                        className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-primary/20 text-primary transition-all active:scale-90"
                                    >
                                        {isCopied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-lg">
                                        <UserCircle className="w-3.5 h-3.5 text-white/40" />
                                    </div>
                                    <p className="text-[10px] font-black text-white/60 uppercase truncate w-32">@{profile?.name}</p>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                                    <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[7px] font-black text-green-500 uppercase tracking-widest">Active Node</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 📜 FUNDING PROTOCOLS */}
                <section className="space-y-3">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Ecosystem Rails</p>
                    <div className="space-y-2">
                        <FundingOption icon={AtSign} title="Share Identifier" desc="Receive from other terminal nodes" color="text-blue-400" />
                        <FundingOption icon={Hash} title="USSD Protocol" desc="Fund via external bank codes" color="text-orange-400" />
                        <FundingOption icon={CreditCard} title="Card Handshake" desc="Connect local debit node" color="text-amber-400" />
                        <FundingOption icon={QrCode} title="QR Discovery" desc="Display funding QR node" color="text-primary" />
                    </div>
                </section>

                <div className="p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/5 text-center">
                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest leading-relaxed">
                        Notice: Bank transfers are synchronized via Flutterwave in real-time. Settlements usually confirm within 2 minutes.
                    </p>
                </div>
            </main>

            <footer className="p-10 flex flex-col items-center gap-3 opacity-20 pb-20">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Handshake Secured v6.0</span>
                </div>
            </footer>
        </div>
    );
}

function FundingOption({ icon: Icon, title, desc, color }: any) {
    return (
        <button className="w-full flex items-center justify-between p-5 rounded-[2rem] bg-[#0a0a0c] border border-white/5 hover:border-primary/20 transition-all group shadow-lg active:scale-[0.98]">
            <div className="flex items-center gap-5">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-white/[0.03] shadow-inner", color)}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="text-left">
                    <p className="font-black text-sm text-white uppercase tracking-tight">{title}</p>
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5">{desc}</p>
                </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-primary transition-colors" />
        </button>
    );
}
