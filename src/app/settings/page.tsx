'use client';

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/wallet-provider";
import { useUser } from "@/contexts/user-provider";
import { useCurrency, CURRENCY_REGISTRY } from "@/contexts/currency-provider";
import { useAppTheme } from "@/contexts/theme-provider";
import { supabase } from "@/lib/supabase/client";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { 
  Trash2, 
  ShieldAlert, 
  ArrowLeft, 
  KeyRound, 
  LogOut, 
  Globe, 
  ChevronRight, 
  ShieldCheck,
  Settings2,
  Lock,
  Loader2,
  ShieldX,
  CheckCircle2,
  Search,
  Palette,
  Zap,
  ShieldOff,
  Database,
  History,
  Crown,
  LayoutGrid,
  Clock,
  ChevronDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { motion } from "framer-motion";
import { purgeLocalWalletCache } from "@/lib/wallets/services/wallet-actions";

/**
 * INSTITUTIONAL HARDWARE SETTINGS
 * Version: 14.1.0 (Color Integrity Standard)
 */
export default function SettingsPage() {
    const { deleteWallet, deleteWalletPermanently, logout } = useWallet();
    const { user, profile, isPremium } = useUser();
    const { selectedCurrency, setCurrency, currentSymbol } = useCurrency();
    const { activeTheme } = useAppTheme();
    const { toast } = useToast();
    const router = useRouter();

    // COMPLIANCE SENTINELS
    const isAccountProtected = profile?.is_disabled || profile?.security_locked;

    // SECURITY PROTOCOL STATE
    const [mnemonic, setMnemonic] = useState<string | null>(null);
    const [isCurrencySheetOpen, setIsCurrencySheetOpen] = useState(false);
    const [currencySearch, setCurrencySearch] = useState('');
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [securityMode, setSecurityMode] = useState<'idle' | 'reveal' | 'destroy'>('idle');
    const [passwordInput, setPasswordInput] = useState('');
    const [confirmInput, setConfirmInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [isDestroying, setIsDestroying] = useState(false);
    
    // Clear Storage State
    const [isClearStorageOpen, setIsClearStorageOpen] = useState(false);

    const handleVerifyPassword = async () => {
        if (!user?.email || !passwordInput) return;
        setIsVerifying(true);
        try {
            const { error } = await supabase!.auth.signInWithPassword({
                email: user.email,
                password: passwordInput
            });

            if (error) throw error;

            const saved = localStorage.getItem(`ss-mnemonic-${user.id}`);
            setMnemonic(saved);
            setIsVerified(true);
        } catch (e: any) {
            toast({ 
                title: "Verification Failed", 
                description: "Invalid password standard.",
                variant: "destructive" 
            });
            setPasswordInput('');
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePermanentDestroy = async () => {
        if (confirmInput !== 'DELETE') return;
        setIsDestroying(true);
        try {
            await deleteWalletPermanently();
            resetSecurityFlow();
        } catch (e) {
            // Error toast handled by provider
        } finally {
            setIsDestroying(false);
        }
    };

    const handleClearLocalRegistry = () => {
        toast({ title: "Purge Initialized", description: "Terminating all local identity nodes..." });
        localStorage.clear();
        sessionStorage.clear();
        setTimeout(() => {
            window.location.href = '/auth/login';
        }, 1000);
    };

    const resetSecurityFlow = () => {
        setSecurityMode('idle'); 
        setPasswordInput(''); 
        setIsVerified(false); 
        setConfirmInput(''); 
        setIsVerifying(false);
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
        } catch (e) {
            toast({ title: "Logout Error", variant: "destructive" });
        } finally {
            setIsLoggingOut(false);
        }
    };

    const filteredCurrencies = useMemo(() => {
        return CURRENCY_REGISTRY.filter(c => 
            c.code.toLowerCase().includes(currencySearch.toLowerCase()) || 
            c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
            c.country.toLowerCase().includes(currencySearch.toLowerCase())
        );
    }, [currencySearch]);

    const daysLeft = useMemo(() => {
      if (!profile?.premium_expires_at) return 0;
      const expiry = new Date(profile.premium_expires_at).getTime();
      const now = Date.now();
      return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }, [profile?.premium_expires_at]);

    const SettingItem = ({ icon: Icon, label, value, onClick, href, destructive, iconBg = "bg-primary/10", iconColor = "text-primary", rightElement, disabled }: any) => {
        const Content = (
            <div className={cn("flex items-center justify-between w-full group", disabled && "opacity-40 grayscale pointer-events-none")}>
                <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all group-active:scale-90", iconBg, iconColor)}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <p className={cn("text-sm font-bold", destructive ? "text-red-500" : "text-white/90")}>{label}</p>
                        {value && <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mt-0.5">{value}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {rightElement}
                    {!destructive && <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />}
                </div>
            </div>
        );
        return href ? (<Link href={href} className="flex py-4 px-3 hover:bg-white/5 transition-all rounded-2xl">{Content}</Link>) : (<button onClick={onClick} className="flex w-full py-4 px-3 hover:bg-white/5 transition-all rounded-2xl">{Content}</button>);
    };

    return (
        <div className="flex flex-col min-h-screen bg-transparent text-foreground relative overflow-hidden">
            <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white/90">Hardware Settings</h1>
                    <div className="flex items-center gap-1.5 mt-1.5"><Settings2 className="w-2.5 h-2.5 text-primary" /><span className="text-[8px] text-primary font-black uppercase tracking-tighter">Registry Preferences</span></div>
                </div>
                <div className="w-10" />
            </header>

            <main className="flex-1 overflow-y-auto thin-scrollbar pb-32 relative z-10">
                <div className="max-w-2xl mx-auto p-6 space-y-10">

                    {/* 🎖️ ELITE STATUS NODE */}
                    <section className="space-y-3">
                        <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Elite Status</h2>
                        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-2 shadow-2xl">
                             <button 
                                onClick={() => router.push('/premium')}
                                className={cn(
                                    "w-full p-6 rounded-[2rem] border flex items-center justify-between group active:scale-[0.98] transition-all relative overflow-hidden",
                                    isPremium ? "bg-green-500/5 border-green-500/20" : "bg-gradient-to-br from-primary/10 to-transparent border-primary/20"
                                )}
                             >
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl border transition-transform group-hover:scale-105",
                                        isPremium ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-primary/10 border-primary/20 text-primary"
                                    )}>
                                        {isPremium ? <Zap className="w-7 h-7 fill-current" /> : <Crown className="w-7 h-7" />}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1">
                                            {isPremium ? `${profile?.plan_type} Active` : 'Upgrade to Premium'}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            {isPremium ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3 text-green-500/60" />
                                                    <span className="text-[9px] font-black text-green-500/60 uppercase tracking-widest">{daysLeft} Days Remaining</span>
                                                </div>
                                            ) : (
                                                <p className="text-[9px] text-primary/60 font-bold uppercase tracking-widest leading-none">
                                                    Unlock Zero-Fee Protocol
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className={cn(
                                    "w-5 h-5 transition-all",
                                    isPremium ? "text-green-500/40 group-hover:text-green-500" : "text-primary/40 group-hover:text-primary"
                                )} />
                                {isPremium && <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl rounded-full -mr-16 -mt-16" />}
                             </button>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Interface Nodes</h2>
                        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-2 space-y-1 shadow-2xl">
                            <SettingItem 
                                icon={Palette} 
                                label="Appearance" 
                                value={activeTheme.name}
                                iconBg="bg-primary/10" 
                                iconColor="text-primary" 
                                href="/settings/appearance"
                                rightElement={
                                    <div 
                                        className="w-5 h-5 rounded-full border border-white/10" 
                                        style={{ backgroundColor: activeTheme.hex, boxShadow: `0 0 8px ${activeTheme.hex}66` }} 
                                    />
                                }
                            />
                            <SettingItem icon={Globe} label="Display Currency" value={`${selectedCurrency} (${currentSymbol})`} iconBg="bg-primary/10" iconColor="text-primary" onClick={() => setIsCurrencySheetOpen(true)} />
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Security Node</h2>
                        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-2 space-y-1 shadow-2xl">
                            <SettingItem icon={KeyRound} label="Manage API Keys" value="Infura / Network RPCs" iconBg="bg-primary/10" iconColor="text-primary" href="/settings/api-keys" />
                            <button 
                                onClick={() => !isAccountProtected && setSecurityMode('reveal')} 
                                className={cn(
                                    "flex w-full py-4 px-3 hover:bg-white/5 transition-all rounded-2xl group",
                                    isAccountProtected && "opacity-40 grayscale cursor-not-allowed"
                                )}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isAccountProtected ? "bg-red-500/10 text-red-400" : "bg-primary/10 text-primary")}>
                                            {isAccountProtected ? <ShieldOff className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-white/90">Show Recovery Phrase</p>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mt-0.5">
                                              Master Secret Key
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] px-2">Registry Maintenance</h2>
                        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-2 space-y-1 shadow-2xl">
                            <SettingItem 
                                icon={Database} 
                                label="Clear Local Registry" 
                                value="Wipe device cache" 
                                iconBg="bg-primary/10" 
                                iconColor="text-primary" 
                                onClick={() => setIsClearStorageOpen(true)} 
                            />
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.2em] px-2">Session Protocol</h2>
                        <div className="bg-red-500/[0.02] border border-red-500/10 rounded-[2.5rem] p-2 space-y-1 shadow-2xl">
                            <AlertDialog>
                                <AlertDialogTrigger asChild disabled={isAccountProtected}>
                                    <button className={cn(
                                        "flex w-full py-4 px-3 hover:bg-red-500/10 transition-all rounded-2xl group",
                                        isAccountProtected && "opacity-40 grayscale cursor-not-allowed"
                                    )}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500 group-hover:scale-110 transition-transform"><Trash2 className="w-5 h-5" /></div>
                                            <div className="text-left">
                                              <p className="text-sm font-bold text-red-500">Purge Local Keys</p>
                                              <p className="text-[10px] text-red-500/60 uppercase tracking-widest font-black opacity-60">Immediate Removal</p>
                                            </div>
                                        </div>
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-black border-red-500/20 rounded-[2.5rem] shadow-2xl">
                                    <AlertDialogHeader><AlertDialogTitle className="text-2xl font-black text-white">Purge Local Cache?</AlertDialogTitle><AlertDialogDescription className="text-zinc-400">This will permanently remove the secret phrase from this device. Access can only be restored via Cloud Vault.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter className="mt-6 gap-2"><AlertDialogCancel className="rounded-2xl h-14 bg-white/5">Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteWallet} className="bg-red-500 rounded-2xl h-14 font-black">Yes, Purge Node</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <button 
                                onClick={() => !isAccountProtected && setSecurityMode('destroy')} 
                                className={cn(
                                    "flex w-full py-4 px-3 hover:bg-red-500/10 transition-all rounded-2xl group",
                                    isAccountProtected && "opacity-40 grayscale cursor-not-allowed"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500 group-hover:scale-110 transition-transform"><ShieldAlert className="w-5 h-5" /></div>
                                    <div className="text-left">
                                      <p className="text-sm font-bold text-red-500">Destroy Cloud Vault</p>
                                      <p className="text-[10px] text-red-500/60 uppercase tracking-widest font-black opacity-60">Permanent Global Removal</p>
                                    </div>
                                </div>
                            </button>

                            <button onClick={handleLogout} className="flex w-full py-4 px-3 hover:bg-red-500/10 transition-all rounded-2xl group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500">
                                        {isLoggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                                    </div>
                                    <div className="text-left"><p className="text-sm font-bold text-red-500">Log Out & Terminate</p><p className="text-[10px] text-red-500/60 uppercase tracking-widest font-black opacity-60">End Node Session</p></div>
                                </div>
                            </button>
                        </div>
                    </section>
                </div>
            </main>

            <AlertDialog open={isClearStorageOpen} onOpenChange={setIsClearStorageOpen}>
                <AlertDialogContent className="bg-[#0a0a0c] border-primary/20 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px]">
                    <AlertDialogHeader className="items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
                            <Database className="w-8 h-8" />
                        </div>
                        <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Clear Local Registry?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed uppercase tracking-widest font-bold">
                            Warning: Clearing your local storage will <span className="text-white">instantly terminate your session</span>. You will be required to log in again to synchronize with the cloud vault.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 flex flex-col gap-3 sm:flex-col">
                        <AlertDialogAction 
                            onClick={handleClearLocalRegistry}
                            className="w-full h-14 rounded-2xl bg-primary hover:brightness-110 text-black font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20"
                        >
                            Wipe & Log Out
                        </AlertDialogAction>
                        <AlertDialogCancel className="w-full h-12 rounded-2xl bg-white/5 border-white/10 text-muted-foreground font-bold uppercase text-[10px] m-0">
                            Dismiss
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={securityMode !== 'idle'} onOpenChange={(open) => !open && resetSecurityFlow()}>
                <AlertDialogContent className="bg-[#0a0a0c] border-white/10 rounded-[2.5rem] p-8 max-w-[95vw] sm:max-w-[400px]">
                    <AlertDialogHeader className="space-y-4">
                        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto", securityMode === 'destroy' ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary")}>
                            {securityMode === 'destroy' ? <ShieldAlert className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
                        </div>
                        <AlertDialogTitle className="text-2xl font-black text-center text-white">Identity Verification</AlertDialogTitle>
                    </AlertDialogHeader>
                    {!isVerified ? (
                        <div className="mt-6 space-y-4">
                            <Input type="password" placeholder="Enter node password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="h-14 bg-white/5 rounded-2xl" />
                            <Button className="w-full h-14 rounded-2xl font-black bg-primary" onClick={handleVerifyPassword} disabled={isVerifying}>{isVerifying ? <Loader2 className="animate-spin" /> : "Verify"}</Button>
                        </div>
                    ) : (
                        <div className="mt-6">
                            {securityMode === 'reveal' && (
                                <div className="space-y-4">
                                    <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 font-mono text-center text-sm break-words text-white">
                                        {mnemonic || "No phrase detected in local registry."}
                                    </div>
                                    <Button variant="outline" className="w-full h-14 rounded-2xl font-black text-xs uppercase" onClick={() => {
                                        navigator.clipboard.writeText(mnemonic || '');
                                        toast({ title: "Copied to clipboard" });
                                    }} disabled={!mnemonic}>Copy Phrase</Button>
                                </div>
                            )}
                            {securityMode === 'destroy' && (
                                <div className="space-y-4">
                                    <Input placeholder="Type DELETE" value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} className="h-14 text-center font-black" />
                                    <Button className="w-full h-14 rounded-2xl bg-red-500 font-black" onClick={handlePermanentDestroy} disabled={confirmInput !== 'DELETE' || isDestroying}>Confirm Destruction</Button>
                                </div>
                            )}
                        </div>
                    )}
                    <AlertDialogFooter className="mt-8"><AlertDialogCancel className="rounded-2xl h-14 bg-white/5" onClick={resetSecurityFlow}>Cancel</AlertDialogCancel></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Sheet open={isCurrencySheetOpen} onOpenChange={setIsCurrencySheetOpen}>
                <SheetContent side="bottom" className="bg-[#0a0a0c] border-t border-primary/20 rounded-t-[3.5rem] h-[85vh] p-0 overflow-hidden shadow-2xl flex flex-col">
                    <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-4 shrink-0" />
                    <SheetHeader className="px-6 mb-4 shrink-0">
                        <SheetTitle className="text-2xl font-black uppercase tracking-widest text-center text-white">Select Currency</SheetTitle>
                        <SheetDescription className="text-center text-[10px] font-black uppercase text-primary/60 tracking-widest">
                            Regional Valuation Protocol
                        </SheetDescription>
                    </SheetHeader>

                    <div className="px-6 mb-6 shrink-0">
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-primary/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                            <div className="relative bg-zinc-950 border border-white/10 rounded-2xl">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                                <Input 
                                    placeholder="Search currencies..."
                                    className="bg-transparent border-none pl-11 h-14 rounded-2xl focus-visible:ring-0 text-base text-white placeholder:text-white/20"
                                    value={currencySearch}
                                    onChange={(e) => setCurrencySearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 px-6">
                        <div className="space-y-2 pb-32">
                            {filteredCurrencies.map(currency => (
                                <button 
                                    key={currency.code} 
                                    onClick={() => { setCurrency(currency.code); setIsCurrencySheetOpen(false); }} 
                                    className={cn(
                                        "w-full p-5 text-left font-bold transition-all flex items-center justify-between group rounded-[2rem] border transition-all active:scale-[0.98]",
                                        selectedCurrency === currency.code 
                                            ? "bg-primary/10 border-primary/40 shadow-[0_0_30px_rgba(139,92,246,0.1)]" 
                                            : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                            <span className="text-xl font-black text-primary">{currency.symbol}</span>
                                        </div>

                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl leading-none">{currency.flag}</span>
                                                <span className="text-sm font-black text-white/90 uppercase tracking-tight">
                                                    {currency.name}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-40">
                                                {currency.code} • {currency.country}
                                            </span>
                                        </div>
                                    </div>

                                    {selectedCurrency === currency.code && (
                                        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-primary" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
    );
}

