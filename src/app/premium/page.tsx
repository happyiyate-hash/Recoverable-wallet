
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Crown, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  Star,
  Sparkles,
  ChevronRight,
  ShieldPlus,
  Clock,
  Gem,
  Loader2,
  Cpu,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/user-provider';
import { useToast } from '@/hooks/use-toast';
import { grant_subscription } from '@/app/actions';

/**
 * INSTITUTIONAL PREMIUM TERMINAL (TIERED ACCESS)
 * Version: 5.0.0 (Authority Handshake Standard)
 */

type TierId = 'premium' | 'pro' | 'elite';
type Duration = 1 | 2 | 3 | 5 | 12;

interface TierNode {
  id: TierId;
  name: string;
  monthlyPrice: number;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  benefits: string[];
}

const TIERS: TierNode[] = [
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 5,
    icon: ShieldPlus,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    benefits: [
      '50% Lower Platform Fees',
      'Priority Cloud Sync Node',
      'Verified Registry Badge',
      'Basic AI Analysis'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 10,
    icon: Zap,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    benefits: [
      'Zero Platform Fees',
      'Unlimited Sponsored Swaps',
      'Advanced Risk Intelligence',
      '24/7 Priority Liaison'
    ]
  },
  {
    id: 'elite',
    name: 'Elite',
    monthlyPrice: 20,
    icon: Crown,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    benefits: [
      'Full Institutional Access',
      'All Elite Themes Unlocked',
      'Early Beta Node Access',
      'Custom Registry Identity'
    ]
  }
];

const DURATIONS: { label: string; value: Duration }[] = [
  { label: '1M', value: 1 },
  { label: '2M', value: 2 },
  { label: '3M', value: 3 },
  { label: '5M', value: 5 },
  { label: '12M', value: 12 },
];

export default function PremiumPage() {
  const router = useRouter();
  const { user, profile, isPremium, refreshProfile } = useUser();
  const { toast } = useToast();
  
  const [selectedTier, setSelectedTier] = useState<TierId>('premium');
  const [selectedDuration, setSelectedDuration] = useState<Duration>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeTier = useMemo(() => 
    TIERS.find(t => t.id === selectedTier) || TIERS[0], 
  [selectedTier]);

  const totalCost = activeTier.monthlyPrice * selectedDuration;

  const handleAuthorize = async () => {
    if (!user || isProcessing) return;

    setIsProcessing(true);
    toast({ title: "Settlement Protocol Active", description: "Verifying institutional handshake..." });

    try {
      await new Promise(r => setTimeout(r, 2000));
      const result = await grant_subscription(user.id, activeTier.name, selectedDuration);

      if (result.success) {
        toast({ title: "Authority Node Upgraded", description: `You are now a ${activeTier.name} member!` });
        await refreshProfile();
        router.replace('/');
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      toast({ 
        variant: "destructive", 
        title: "Settlement Denied", 
        description: e.message || "Institutional handshake failed." 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const daysLeft = useMemo(() => {
    if (!profile?.premium_expires_at) return 0;
    const expiry = new Date(profile.premium_expires_at).getTime();
    const now = Date.now();
    return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  }, [profile?.premium_expires_at]);

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white overflow-hidden">
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col items-center">
          <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white">Elite Protocol</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <ShieldCheck className="w-2.5 h-2.5 text-primary" />
            <span className="text-[8px] text-primary font-black uppercase tracking-tighter">
              Status Registry Hub
            </span>
          </div>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 p-6 space-y-10 max-w-lg mx-auto w-full pb-48 overflow-y-auto thin-scrollbar relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] -mr-64 -mt-64 rounded-full pointer-events-none" />

        {/* 📊 CURRENT STATUS REGISTRY */}
        {isPremium && (
          <section className="px-2">
            <div className="p-6 rounded-[2.5rem] bg-green-500/5 border border-green-500/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck className="w-16 h-16 text-green-500" /></div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                        <Zap className="w-6 h-6 fill-current" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest leading-none">Active Authority</p>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight mt-1">{profile?.plan_type} Tier</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                            <Clock className="w-3 h-3 text-white/40" />
                            <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{daysLeft} Days Remaining</span>
                        </div>
                    </div>
                </div>
            </div>
          </section>
        )}

        {/* 🏆 TIER SELECTOR */}
        <section className="space-y-4">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Upgrade Identity</p>
          <div className="grid grid-cols-3 gap-2">
            {TIERS.map((tier) => {
              const isActive = selectedTier === tier.id;
              const Icon = tier.icon;
              return (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  disabled={isProcessing}
                  className={cn(
                    "p-4 rounded-[2rem] border transition-all flex flex-col items-center gap-2 group active:scale-95",
                    isActive 
                      ? cn("bg-white/[0.05]", tier.borderColor) 
                      : "bg-white/[0.02] border-white/5 opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg", tier.bgColor, tier.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isActive ? "text-white" : "text-white/40")}>
                    {tier.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 💳 DURATION SELECTOR */}
        <section className="space-y-4">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Handshake Duration</p>
          <div className="flex p-1.5 bg-white/5 border border-white/10 rounded-2xl">
            {DURATIONS.map((dur) => (
              <button 
                key={dur.value}
                onClick={() => setSelectedDuration(dur.value)}
                disabled={isProcessing}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  selectedDuration === dur.value 
                    ? "bg-white text-black shadow-lg" 
                    : "text-white/40 hover:text-white"
                )}
              >
                {dur.label}
              </button>
            ))}
          </div>
        </section>

        {/* 📜 BENEFITS LIST */}
        <section className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div 
              key={selectedTier}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-2"
            >
              <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/5 space-y-4 shadow-xl">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                   <activeTier.icon className={cn("w-5 h-5", activeTier.color)} />
                   <h3 className="text-sm font-black uppercase tracking-widest text-white">{activeTier.name} Node Details</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {activeTier.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-white/5")}>
                        <CheckCircle2 className={cn("w-3 h-3", activeTier.color)} />
                      </div>
                      <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </section>

        <div className="pt-8 flex flex-col items-center gap-3 opacity-20 pb-20">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Protocol Authority v4.0 SECURE</span>
          </div>
        </div>
      </main>

      {/* 🤖 THE ROBOT AUTHORIZATION HUB (FIXED BOTTOM) */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black to-transparent backdrop-blur-md z-50">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="p-1 rounded-[2.5rem] bg-gradient-to-r from-primary/40 via-primary/10 to-primary/40 shadow-[0_0_50px_rgba(var(--primary),0.1)]"
          >
            <button
              disabled={isProcessing}
              onClick={handleAuthorize}
              className={cn(
                "w-full h-20 rounded-[2.2rem] bg-black border-2 border-primary/20 flex flex-col items-center justify-center relative overflow-hidden transition-all active:scale-95 group",
                isProcessing && "opacity-80"
              )}
            >
              <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
              
              {isProcessing ? (
                <div className="flex items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <div className="text-left">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">Establishing Node</p>
                    <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Registry Sync in progress</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6 px-10 w-full justify-between">
                  <div className="text-left">
                    <p className="text-[9px] font-black text-primary/60 uppercase tracking-[0.3em] leading-none mb-1">Total Settlement</p>
                    <h3 className="text-3xl font-black text-white tracking-tighter leading-none">${totalCost.toFixed(2)}</h3>
                  </div>
                  <div className="h-10 w-px bg-primary/20" />
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">Authorize {activeTier.name}</p>
                      <p className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em]">{selectedDuration} Month Handshake</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-black shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                      <Zap className="w-5 h-5 fill-current" />
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-primary/20 -translate-x-1 -translate-y-1" />
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary/20 translate-x-1 -translate-y-1" />
              <div className="absolute bottom-0 left-0 w-2 h-2 rounded-full bg-primary/20 -translate-x-1 translate-y-1" />
              <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-primary/20 translate-x-1 translate-y-1" />
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
