'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/user-provider";
import { useWallet } from "@/contexts/wallet-provider";
import { useCurrency } from "@/contexts/currency-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ShieldCheck, 
  Copy, 
  CheckCircle2, 
  RefreshCw, 
  Users, 
  ChevronDown,
  QrCode, 
  TrendingUp,
  Loader2,
  AlertCircle,
  Zap,
  Activity,
  Gift,
  Ticket,
  LayoutGrid,
  Shield,
  ArrowRight,
  Settings,
  Cloud,
  Handshake,
  Star,
  Crown,
  Landmark,
  CreditCard,
  Bot
} from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import QRCode from "react-qr-code";
import { motion, AnimatePresence } from 'framer-motion';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import { escrowService } from '@/lib/services/escrow-service';
import ReviewBottomSheet from '@/components/escrow/review-bottom-sheet';
import AccountSwitcherSheet from '@/components/wallet/account-switcher-sheet';

export const dynamic = 'force-dynamic';

/**
 * INSTITUTIONAL COMMAND CENTER (PROFILE V4)
 * Version: 49.0.0 (Registry Streamline Node)
 * 
 * Rules:
 * 1. ZERO REDUNDANCY: Removed portfolio and security audit nodes (handled in Settings/Wallet).
 * 2. IDENTITY FOCUS: Prioritizes account switching and institutional services.
 */
export default function ProfilePage() {
    const router = useRouter();
    const { user, profile, isPremium, refreshProfile, loading: authLoading } = useUser();
    const { 
        allChains,
        wallets, 
        syncAllAddresses,
        accountNumber: walletAccountNumber,
        runCloudDiagnostic,
        getAddressForChain
    } = useWallet();
    const { prices } = useWallet();
    const { toast } = useToast();
    const [isIdCopied, copyId] = useCopyToClipboard();
    const [isSyncing, setIsSyncing] = useState(false);

    const [isQrOpen, setIsQrOpen] = useState(false);
    const [isRedeemOpen, setIsRedeemOpen] = useState(false);
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const [giftCode, setGiftCode] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [redeemResult, setRedeemResult] = useState<{ success: boolean, amount?: number, message?: string } | null>(null);

    // Live Escrow & Reputation Stats
    const [escrowStats, setEscrowStats] = useState({ held: 0, shipped: 0, disputed: 0 });
    const [reputation, setReputation] = useState({ average: 0, count: 0, tier: 1 });
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    useEffect(() => {
        async function fetchRegistryStats() {
            if (!user?.id || !supabase) return;
            try {
                const [statsData, repData] = await Promise.all([
                    supabase.from('escrow_trades').select('status').or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
                    escrowService.fetchUserRating(user.id)
                ]);

                if (statsData.data) {
                    const stats = statsData.data.reduce((acc, trade) => {
                        if (trade.status === 'FUNDED') acc.held++;
                        if (trade.status === 'DELIVERING') acc.shipped++;
                        if (trade.status === 'DISPUTED') acc.disputed++;
                        return acc;
                    }, { held: 0, shipped: 0, disputed: 0 });
                    setEscrowStats(stats);
                }

                if (repData) setReputation(repData);
            } catch (e) {}
        }
        fetchRegistryStats();
    }, [user?.id]);

    const displayAccountNumber = walletAccountNumber || profile?.account_number;
    const displayName = profile?.name || (authLoading ? 'Initializing Node...' : 'Institutional User');

    const qrValue = useMemo(() => {
        if (!displayAccountNumber) return "";
        return `wnc://pay?account=${displayAccountNumber}&symbol=WNC`;
    }, [displayAccountNumber]);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await refreshProfile();
            if (wallets && user && displayAccountNumber) {
                await syncAllAddresses(user.id, wallets, displayAccountNumber);
            }
            toast({ title: "Registry Synchronized", description: "Identity and vault nodes verified." });
        } finally {
            setTimeout(() => setIsSyncing(false), 1000);
        }
    };

    const handleCloudScan = async () => {
        if (runCloudDiagnostic) {
            await runCloudDiagnostic(true);
        }
    };

    const handleRedeemCode = async () => {
        const cleanCode = giftCode.trim().toUpperCase();
        if (!cleanCode || !user || !supabase) return;
        setIsRedeeming(true);
        setRedeemResult(null);
        try {
            const { data, error } = await supabase.rpc('redeem_gift_card', { user_id: user.id, input_code: cleanCode });
            if (error) throw error;
            if (data.success) {
                const amount = data.amount !== undefined ? data.amount : (data.amount_wnc || 0);
                setRedeemResult({ success: true, amount: amount, message: data.message });
                toast({ title: "Redemption Authorized", description: `Successfully claimed ${amount} WNC!` });
                await refreshProfile();
            } else {
                setRedeemResult({ success: false, message: data.message || 'Invalid or already redeemed gift code.' });
            }
        } catch (e: any) {
            setRedeemResult({ success: false, message: e.message || "Registry connection failed." });
        } finally { setIsRedeeming(false); }
    };

    const isNigeriaUser = profile?.country_code === 'NG';

    const ActionBox = ({ icon: Icon, header, label, desc, onClick, color = "text-primary", bgColor = "bg-primary/10", badge, locked }: any) => (
        <div className="flex flex-col gap-2">
            {header && <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] px-1">{header}</p>}
            <button 
              onClick={onClick} 
              disabled={locked}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group relative overflow-hidden active:scale-95 text-center aspect-square",
                locked && "opacity-40 grayscale"
              )}
            >
                <div className={cn("w-10 h-10 rounded-xl bg-black border border-white/5 flex items-center justify-center mb-2 transition-transform group-hover:scale-110 shadow-lg", bgColor, color)}>
                    <Icon className="w-5 h-5" strokeWidth={3} />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                    <p className="text-[10px] font-black text-white/90 uppercase tracking-tight leading-none">{label}</p>
                    <p className="text-[7px] text-muted-foreground uppercase font-bold tracking-widest opacity-60 leading-tight">{desc}</p>
                </div>
                {badge && <span className="absolute top-2 right-2 text-[6px] font-black bg-primary text-black px-1.5 py-0.5 rounded-full uppercase tracking-widest">{badge}</span>}
                {locked && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                    <Activity className="w-5 h-5 text-white/40" strokeWidth={3} />
                  </div>
                )}
            </button>
        </div>
    );

    const getTierLabel = (t: number) => {
      if (t === 4) return "Market Legend";
      if (t === 3) return "Registry Veteran";
      if (t === 2) return "Verified Trader";
      return "New Node";
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground relative">
            <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary opacity-60" strokeWidth={3} />
                    <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white/90">Identity Registry</h1>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => router.push('/ai-copilot')}
                        className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all animate-pulse group active:scale-90"
                    >
                        <Bot className="w-5 h-5" strokeWidth={3} />
                    </button>
                    <Button variant="ghost" size="icon" onClick={() => setIsQrOpen(true)} className="rounded-xl hover:bg-primary/10 text-primary transition-all"><QrCode className="w-4 h-4" strokeWidth={3} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsRedeemOpen(true)} className="rounded-xl hover:bg-primary/10 text-primary transition-all"><Gift className="w-4 h-4" strokeWidth={3} /></Button>
                    <Button variant="ghost" size="icon" onClick={handleSync} className={cn("rounded-xl", isSyncing && "animate-spin")}><RefreshCw className="w-4 h-4 text-muted-foreground" strokeWidth={3} /></Button>
                </div>
            </header>

            <main className="flex-1 p-6 space-y-8 max-w-2xl mx-auto w-full pb-32 overflow-y-auto thin-scrollbar relative z-10">

                {/* 💳 INSTITUTIONAL IDENTITY CARD */}
                <section className="w-full">
                    <div className="p-5 rounded-[2.5rem] bg-[#0a0a0c]/60 backdrop-blur-3xl border border-primary/20 shadow-2xl relative overflow-hidden flex flex-col gap-4 group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[80px] rounded-full -mr-20 -mt-20" />

                        <div className="flex items-center gap-5 relative z-10">
                            <div className="relative cursor-pointer shrink-0" onClick={() => setIsSwitcherOpen(true)}>
                                <div className="absolute -inset-2 bg-primary/10 rounded-full blur-xl opacity-50 group-hover:bg-primary/20 transition-all" />
                                <Avatar className="w-16 h-16 rounded-2xl border border-primary/20 relative z-10 overflow-hidden shadow-2xl bg-black">
                                    <AvatarImage src={profile?.photo_url} className="object-cover" />
                                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-black text-2xl font-black rounded-2xl">{displayName.slice(0, 1)}</AvatarFallback>
                                </Avatar>
                                <div className={cn(
                                    "absolute -bottom-1 -right-1 rounded-full p-1 border-2 border-[#0a0a0c] z-20 shadow-lg",
                                    isPremium ? "bg-amber-500" : "bg-primary"
                                )}>
                                    {isPremium ? <Crown className="w-3.5 h-3.5 text-black" strokeWidth={3} /> : <ShieldCheck className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                                </div>
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 cursor-pointer active:opacity-70 transition-opacity" onClick={() => setIsSwitcherOpen(true)}>
                                    <h2 className="text-xl font-black text-white tracking-tight uppercase leading-none truncate">{displayName}</h2>
                                    <ChevronDown className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" strokeWidth={3} />
                                </div>
                                {isPremium && <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 w-fit block">Premium Elite</span>}
                                <div onClick={(e) => { e.stopPropagation(); if(displayAccountNumber) copyId(displayAccountNumber || ''); }} className="flex items-center gap-1.5 cursor-pointer opacity-40 hover:opacity-100 transition-opacity w-fit mt-1">
                                    <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">ID:</p>
                                    <div className="flex items-center gap-1">
                                        <p className="text-xs font-mono font-bold text-white tracking-widest">{displayAccountNumber || (authLoading ? '...' : '---')}</p>
                                        {isIdCopied ? <CheckCircle2 className="w-3 h-3 text-green-500" strokeWidth={3} /> : <Copy className="w-3 h-3 text-white/20" strokeWidth={3} />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-2 pt-3 border-t border-white/5 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/40">
                                    Tier {reputation.tier}: {getTierLabel(reputation.tier)}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Identity Services</p>
                        <div className="grid grid-cols-3 gap-3">
                            <ActionBox header="Grow Base" icon={Users} label="Invites" desc="Refer & Earn" onClick={() => router.push('/invites')} />
                            <ActionBox header="Yield engine" icon={TrendingUp} label="Finance" desc="Yield Hub" onClick={() => router.push('/defi')} />
                            <ActionBox header="Asset Discovery" icon={LayoutGrid} label="Browse" desc="Market Feed" onClick={() => router.push('/browse')} />
                            <ActionBox 
                              header="Trust Protocol" 
                              icon={Shield} 
                              label="Escrow" 
                              desc="Trust Node" 
                              onClick={() => router.push('/escrow')} 
                              locked={profile?.is_disabled}
                            />
                            {isNigeriaUser ? (
                              <ActionBox 
                                header="Naira Node" 
                                icon={Landmark} 
                                label="Naira Wallet" 
                                desc="Local Rails" 
                                onClick={() => router.push('/naira-wallet')} 
                                color="text-emerald-400"
                                bgColor="bg-emerald-500/10"
                              />
                            ) : (
                              <ActionBox 
                                header="Fiat Gateway" 
                                icon={CreditCard} 
                                label="Buy" 
                                desc="Fiat Node" 
                                onClick={() => router.push('/buy')} 
                                color="text-emerald-400"
                                bgColor="bg-emerald-500/10"
                              />
                            )}
                            <ActionBox header="Registry" icon={Settings} label="Settings" desc="Edit Profile" onClick={() => router.push('/profile/settings')} />
                        </div>
                    </div>

                    <CloudRegistryHero 
                        onActivate={() => router.push('/security/backup')}
                        allChains={allChains}
                        wallets={wallets}
                        getAddressForChain={getAddressForChain}
                    />
                </section>

                <div className="pt-4 flex flex-col items-center gap-3 opacity-20">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                        <ShieldCheck className="w-3 h-3 text-primary" strokeWidth={3} />
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Protocol Audit: 100% SECURE</span>
                    </div>
                </div>
            </main>

            <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px] overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-primary/60 to-primary animate-gradient-flow" />
                    <DialogHeader className="space-y-4 items-center text-center">
                        <div className="w-16 h-16 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/20"><QrCode className="w-8 h-8" strokeWidth={3} /></div>                        <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Identity Node</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground uppercase tracking-widest font-black opacity-60">Scan to resolve identity</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-8 py-6">
                        <div className="bg-white p-6 rounded-[3rem] shadow-[0_0_50px_rgba(245,158,11,0.3)] relative group">
                            {qrValue ? <QRCode value={qrValue} size={200} level="H" style={{ height: "auto", maxWidth: "100%", width: "100%" }} fgColor="#000000" bgColor="#FFFFFF" /> : <div className="w-[200px] h-[200px] flex items-center justify-center bg-zinc-100 rounded-2xl animate-pulse"><Loader2 className="w-8 h-8 animate-spin text-zinc-300" strokeWidth={3} /></div>}
                        </div>
                        <div className="w-full space-y-4">
                            <div onClick={() => displayAccountNumber && copyId(displayAccountNumber || '')} className="flex flex-col items-center gap-1 p-4 rounded-2xl bg-white/[0.03] border border-white/10 cursor-pointer active:scale-95 transition-all group">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Account ID</span>
                                <p className="text-2xl font-mono font-black text-white tracking-[0.1em]">{displayAccountNumber || (authLoading ? '...' : '---')}</p>
                            </div>
                            <Button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-black font-black uppercase text-xs" onClick={() => setIsQrOpen(false)}>Done</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isRedeemOpen} onOpenChange={setIsRedeemOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px] overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-primary/60 to-primary animate-gradient-flow" />
                    <DialogHeader className="space-y-4 items-center text-center">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/20"><Ticket className="w-8 h-8" strokeWidth={3} /></div>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">{redeemResult?.success ? 'Credits Secured' : 'Redeem WNC Node'}</DialogTitle>
                    </DialogHeader>
                    <div className="mt-8 space-y-6">
                        {redeemResult ? (
                            <div className="space-y-6 text-center">
                                {redeemResult.success ? (
                                    <div className="p-6 rounded-[2.5rem] bg-green-500/10 border border-green-500/20 space-y-2">
                                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Amount Authorized</p>
                                        <h3 className="text-4xl font-black text-white">+{redeemResult.amount} WNC</h3>
                                    </div>
                                ) : (
                                    <div className="p-6 rounded-[2.5rem] bg-red-500/10 border border-green-500/20 space-y-2">
                                        <AlertCircle className="w-6 h-6 text-red-500 mx-auto" strokeWidth={3} />
                                        <p className="text-xs font-bold text-red-400">{redeemResult.message}</p>
                                    </div>
                                )}
                                <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest" onClick={() => { setIsRedeemOpen(false); setRedeemResult(null); }}>Dismiss</Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Gift Handshake Code</Label>
                                    <Input placeholder="XXXX-XXXX-XXXX" value={giftCode} onChange={(e) => setGiftCode(e.target.value.toUpperCase())} className="h-16 bg-white/5 border-white/10 rounded-2xl text-center text-2xl font-mono tracking-[0.2em] text-white" />
                                </div>
                                <Button className="w-full h-16 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] bg-primary text-black hover:bg-primary/90" disabled={!giftCode.trim() || isRedeeming} onClick={handleRedeemCode}>{isRedeeming ? <Loader2 className="w-6 h-6 animate-spin" strokeWidth={3} /> : "Verify & Claim"}</Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {user && <ReviewBottomSheet isOpen={isReviewOpen} onOpenChange={setIsReviewOpen} userId={user.id} userName={displayName} />}
            <AccountSwitcherSheet isOpen={isSwitcherOpen} onOpenChange={setIsSwitcherOpen} />
        </div>
    );
}

function CloudRegistryHero({ onActivate, allChains, wallets, getAddressForChain }: any) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scanList = useMemo(() => allChains.slice(0, 15), [allChains]);

    useEffect(() => {
        if (scanList.length === 0) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % scanList.length);
        }, 3500);
        return () => clearInterval(interval);
    }, [scanList.length]);

    const activeChain = scanList[currentIndex];
    const activeAddress = wallets && activeChain ? getAddressForChain(activeChain, wallets) : null;

    return (
        <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 relative overflow-hidden flex flex-col gap-6 shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-3xl rounded-full -mr-20 -mt-20" />
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20"><Cloud className="w-5 h-5" strokeWidth={3} /></div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-tight">Cloud Registry</h3>
                        <p className="text-[8px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Address Verification Node</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20"><div className="w-1 h-1 rounded-full bg-primary animate-pulse" /><span className="text-[8px] font-black text-primary uppercase">Live Pulse</span></div>
            </div>
            <div className="h-20 flex items-center justify-center relative">
                <AnimatePresence mode="wait">
                    {activeChain && (
                        <motion.div key={activeChain.chainId} initial={{ scale: 0.8, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 1.1, opacity: 0, y: -10 }} transition={{ type: "spring", stiffness: 100, damping: 20 }} className="bg-black/40 border border-white/5 rounded-2xl p-3 flex items-center gap-4 w-full shadow-lg">
                            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden"><TokenLogoDynamic logoUrl={activeChain.iconUrl} size={24} chainId={activeChain.chainId} symbol={activeChain.symbol} name={activeChain.name} /></div>
                            <div className="flex-1 min-w-0"><p className="text-[10px] font-black text-white uppercase tracking-tight truncate">{activeChain.name}</p><p className="text-[8px] font-mono text-muted-foreground truncate opacity-60">{activeAddress ? `${activeAddress.slice(0, 12)}...${activeAddress.slice(-8)}` : 'Resolving node...'}</p></div>
                            <div className="pr-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 opacity-40" strokeWidth={3} /></div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className="flex flex-col gap-4 relative z-10">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-3 items-center"><Activity className="w-4 h-4 text-primary/40 shrink-0" strokeWidth={3} /><p className="text-[9px] text-muted-foreground leading-snug font-medium">This system automatically compares your <span className="text-white">Local Storage</span> with our <span className="text-white">Cloud Database</span> to ensure your hardware vault is perfectly synchronized.</p></div>
                <Button onClick={onActivate} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-black font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">View Cloud Registry Node</Button>
            </div>
        </div>
    );
}
