'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Search, 
  ArrowLeft,
  CheckCircle2, 
  Loader2,
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/contexts/user-provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { nairaService, type BankNode } from '@/lib/services/naira-service';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * INSTITUTIONAL NAIRA PAYOUT TERMINAL
 * Version: 3.0.0 (Identity Resolution Standard)
 */
export default function NairaSendPage() {
    const router = useRouter();
    const { profile } = useUser();
    const { toast } = useToast();

    const [accountNumber, setAccountNumber] = useState('');
    const [selectedBank, setSelectedBank] = useState<BankNode | null>(null);
    const [amount, setAmount] = useState('');
    const [resolvedName, setResolvedName] = useState<string | null>(null);
    const [isResolving, setIsResolving] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const [isBankListOpen, setIsBankListOpen] = useState(false);
    const [banks, setBanks] = useState<BankNode[]>([]);
    const [searchBank, setSearchBank] = useState('');

    useEffect(() => {
        nairaService.fetchBanks().then(setBanks);
    }, []);

    // 🔍 IDENTITY RESOLUTION HANDSHAKE
    useEffect(() => {
        if (accountNumber.length === 10 && selectedBank) {
            handleResolve();
        } else {
            setResolvedName(null);
        }
    }, [accountNumber, selectedBank]);

    const handleResolve = async () => {
        setIsResolving(true);
        try {
            const data = await nairaService.resolveAccount(accountNumber, selectedBank!.code);
            if (data?.account_name) setResolvedName(data.account_name);
            else throw new Error("Could not resolve identity.");
        } catch (e) {
            setResolvedName(null);
            toast({ variant: "destructive", title: "Resolution Error", description: "This account node could not be verified." });
        } finally {
            setIsResolving(false);
        }
    };

    const handleTransfer = async () => {
        if (!profile || isSending || !resolvedName) return;
        setIsSending(true);
        try {
            await nairaService.withdraw(profile.id, parseFloat(amount), accountNumber, selectedBank!.code);
            toast({ title: "Payout Authorized", description: "Ledger settlement verified." });
            router.push('/naira-wallet');
        } catch (e: any) {
            toast({ variant: "destructive", title: "Action Denied", description: e.message });
        } finally {
            setIsSending(false);
        }
    };

    const filteredBanks = banks.filter(b => b.name.toLowerCase().includes(searchBank.toLowerCase()));

    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-white">
            <header className="p-6 flex items-center justify-between bg-black/40 backdrop-blur-2xl sticky top-0 z-50 border-b border-white/5">
                <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xs font-black uppercase tracking-[0.3em] leading-none">Payout Dispatch</h1>
                    <span className="text-[8px] text-primary font-bold uppercase mt-1">Verified Handshake</span>
                </div>
                <div className="w-10" />
            </header>

            <main className="flex-1 p-6 space-y-10 pb-40 max-w-lg mx-auto w-full">
                
                <section className="space-y-6">
                    {/* BANK SELECTOR NODE */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Target Registry (Bank)</Label>
                        <button 
                            onClick={() => setIsBankListOpen(true)}
                            className="w-full h-16 bg-white/[0.03] border border-white/10 rounded-[1.5rem] px-6 flex items-center justify-between hover:bg-white/5 transition-all group"
                        >
                            {selectedBank ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight">{selectedBank.name}</span>
                                </div>
                            ) : (
                                <span className="text-sm font-bold text-white/20 uppercase tracking-widest">Select Destination Bank</span>
                            )}
                            <ChevronDown className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
                        </button>
                    </div>

                    {/* ACCOUNT NUMBER NODE */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Account Number</Label>
                        <div className="relative group">
                            <Input 
                                placeholder="000 000 0000"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                className="h-16 bg-white/[0.03] border-white/10 rounded-[1.5rem] px-6 text-2xl font-mono tracking-[0.3em] text-white focus-visible:ring-primary shadow-inner"
                            />
                            {isResolving && <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary" />}
                        </div>
                    </div>

                    {/* IDENTITY RESOLUTION DISPLAY */}
                    <AnimatePresence>
                        {resolvedName && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }} 
                                animate={{ opacity: 1, y: 0 }}
                                className="p-6 rounded-[2.5rem] bg-green-500/5 border border-green-500/10 flex items-center gap-5 shadow-2xl"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-500 shadow-lg">
                                    <UserCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-green-500/60 uppercase tracking-[0.3em]">Verified Recipient Node</p>
                                    <p className="text-base font-black text-white uppercase tracking-tight">{resolvedName}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* AMOUNT NODE */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Dispatch Amount (₦)</Label>
                        <div className="relative group">
                            <Input 
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="h-24 bg-white/[0.03] border-white/10 rounded-[2.5rem] px-8 text-5xl font-black tracking-tighter text-white focus-visible:ring-primary"
                            />
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-black text-white/20 uppercase tracking-widest">NGN</div>
                        </div>
                    </div>
                </section>

                <div className="p-5 rounded-[2rem] bg-primary/5 border border-primary/20 flex gap-4">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-bold uppercase tracking-tight">
                        Settlement Protocol: Funds are debited from your registry balance before external payout is broadcasted. 1.0% fee applies.
                    </p>
                </div>
            </main>

            <div className="fixed bottom-10 left-0 right-0 px-8 z-50 max-w-lg mx-auto w-full">
                <Button 
                    disabled={!resolvedName || !amount || isSending}
                    onClick={handleTransfer}
                    className="w-full h-18 rounded-full bg-primary hover:bg-primary/90 text-black font-black uppercase text-sm tracking-[0.2em] shadow-2xl transition-all active:scale-95 border-b-4 border-primary/50"
                >
                    {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Zap className="w-4 h-4 mr-2 fill-current" /> Authorize Dispatch</>}
                </Button>
            </div>

            {/* BANK SELECTION OVERLAY */}
            <AnimatePresence>
                {isBankListOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col"
                    >
                        <header className="p-6 flex items-center justify-between border-b border-white/5">
                            <h2 className="text-xl font-black uppercase tracking-tight">Select Authority</h2>
                            <button onClick={() => setIsBankListOpen(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"><X className="w-6 h-6" /></button>
                        </header>
                        <div className="p-6">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                                <Input 
                                    className="h-16 bg-white/5 border-white/10 rounded-2xl pl-12 text-sm uppercase font-black" 
                                    placeholder="Search Bank Registry..." 
                                    value={searchBank}
                                    onChange={(e) => setSearchBank(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 pb-20 thin-scrollbar">
                            <div className="grid grid-cols-1 gap-2">
                                {filteredBanks.map((bank) => (
                                    <button 
                                        key={bank.code}
                                        onClick={() => { setSelectedBank(bank); setIsBankListOpen(false); }}
                                        className="w-full p-6 rounded-[2rem] flex items-center justify-between hover:bg-white/5 transition-all group text-left border border-transparent hover:border-white/5"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-primary transition-colors">
                                                <Building2 className="w-6 h-6" />
                                            </div>
                                            <span className="font-black text-sm uppercase tracking-tight">{bank.name}</span>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-primary" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
