
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/wallet-provider';
import { useUser } from '@/contexts/user-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  ShieldCheck, 
  Lock, 
  CloudDownload, 
  Plus, 
  Download, 
  Timer, 
  AlertCircle,
  Zap,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import { notificationService } from '@/lib/services/notification-service';

export const dynamic = 'force-dynamic';

/**
 * ESTABLISH VAULT PAGE
 * Version: 7.0.0 (Cloud-Gated Logic Node)
 */
export default function WalletSessionPage() {
  const { generateWallet, importWallet, restoreFromCloud, wallets, isCloudVaultAvailable } = useWallet();
  const { profile, user, refreshProfile, loading: authLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<'options' | 'import'>('options');
  const [importInput, setImportInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(0);

  const startTimer = () => {
    setTimer(0);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimer(Date.now() - startTimeRef.current);
    }, 10);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopTimer();
  }, []);

  const finalizeReferral = async (newUserId: string) => {
    if (!supabase) return;
    
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const metadataRefCode = currentUser?.user_metadata?.referral_code;
      const localStorageRefCode = localStorage.getItem('pending_referral');
      const refCode = metadataRefCode || localStorageRefCode;
      
      if (!refCode) return;

      const { data: referrer, error: fetchErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', refCode)
        .maybeSingle();

      if (fetchErr || !referrer || referrer.id === newUserId) return;

      await supabase.from('referrals').insert({
        referrer_id: referrer.id,
        referred_user_id: newUserId,
        referral_code_used: refCode,
        status: 'pending',
        total_transfers: 0,
        reward_amount: 0
      });

      localStorage.removeItem('pending_referral');
    } catch (e) {
      console.warn("[REFERRAL_HANDSHAKE_FAIL]", e);
    }
  };

  const finishOnboarding = async () => {
    if (!user || !supabase) {
        router.replace('/');
        return;
    }
    
    setIsProcessing(true);
    setStatus('Synchronizing Registry...');
    
    try {
      await finalizeReferral(user.id);

      const updates: any = {
        id: user.id,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (upsertError) throw upsertError;

      await notificationService.send({
        userId: user.id,
        type: 'REWARD',
        title: 'Identity Established',
        message: 'Welcome to Node Quick. Your multi-chain vault node is now synchronized and active.'
      });

      await refreshProfile();
      setStatus('Ready!');
      setTimeout(() => router.replace('/'), 500);

    } catch (e: any) {
      console.error("[ONBOARDING_FAIL]", e.message);
      setError(e.message || "Failed to finalize registry node.");
      setIsProcessing(false);
    } finally {
      stopTimer();
    }
  };

  const handleCreate = async () => {
    if (isCloudVaultAvailable) {
        setError("Security Node Found: You already have a secret phrase in the cloud. Use 'Cloud Recovery' to restore access.");
        return;
    }
    setIsProcessing(true);
    setError(null);
    setStatus('Deriving Nodes...');
    startTimer();
    try {
      await generateWallet();
      await finishOnboarding();
    } catch (e: any) {
      setError(e.message || "Generation failed.");
      setIsProcessing(false);
      stopTimer();
    }
  };

  const handleImport = async () => {
    if (!importInput.trim()) return;
    setIsProcessing(true);
    setError(null);
    setStatus('Syncing Mnemonic...');
    startTimer();
    try {
      await importWallet(importInput);
      await finishOnboarding();
    } catch (e: any) {
      setStatus('Invalid Node');
      setError("Please verify your 12 or 24 word recovery phrase.");
      setIsProcessing(false);
      stopTimer();
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    setError(null);
    setStatus('Connecting to Cloud...');
    startTimer();
    try {
      await restoreFromCloud(setStatus);
      await finishOnboarding();
    } catch (e: any) {
      setStatus('No Backup Found');
      setError(e.message || "Failed to locate cloud credentials.");
      setIsProcessing(false);
      stopTimer();
    }
  };

  if (authLoading || profile === undefined) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-black gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Auditing Registry...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent p-6 text-foreground relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] -mr-64 -mt-64 rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-sm space-y-10 relative z-10"
      >
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-primary/20 text-primary shadow-2xl">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Establish Vault</h1>
          <div className="flex flex-col items-center gap-1">
            {isProcessing ? (
              <div className="flex items-center gap-2 text-primary font-mono text-xs tracking-tighter animate-pulse">
                <Timer className="w-3 h-3" />
                {(timer / 1000).toFixed(3)}s | {status}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest opacity-60">Manage your institutional keys</p>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'options' ? (
            <motion.div key="options" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
              {error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 mb-4 animate-in fade-in slide-in-from-top-2">
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-xs text-red-400 leading-relaxed font-medium">{error}</p>
                </div>
              )}

              {isCloudVaultAvailable && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex gap-3 mb-2">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-[10px] text-primary/80 font-black uppercase tracking-widest">
                    Existing Cloud Node Detected. Restore required.
                  </p>
                </div>
              )}

              <button 
                onClick={handleRestore}
                disabled={isProcessing || !isCloudVaultAvailable}
                className={cn(
                  "w-full flex items-center justify-between p-6 rounded-[2rem] bg-gradient-to-br from-emerald-500/20 to-transparent backdrop-blur-xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all group active:scale-[0.98] shadow-2xl",
                  !isCloudVaultAvailable && "opacity-40 grayscale pointer-events-none"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <CloudDownload className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white uppercase tracking-tight">Cloud Recovery</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">Restore Encrypted Node</p>
                  </div>
                </div>
                {isCloudVaultAvailable && <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />}
              </button>

              <button 
                onClick={handleCreate}
                disabled={isProcessing || isCloudVaultAvailable}
                className={cn(
                  "w-full flex items-center justify-between p-6 rounded-[2rem] bg-black/40 backdrop-blur-xl border border-primary/20 hover:bg-primary/20 transition-all group active:scale-[0.98] shadow-2xl",
                  isCloudVaultAvailable && "opacity-20 grayscale pointer-events-none"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white uppercase tracking-tight">Create New Node</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">Generate 12-word phrase</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
              </button>

              <button 
                onClick={() => setStep('import')}
                disabled={isProcessing}
                className="w-full flex items-center justify-between p-6 rounded-[2rem] bg-black/40 backdrop-blur-xl border border-white/5 hover:bg-white/10 transition-all group active:scale-[0.98] shadow-2xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
                    <Download className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white uppercase tracking-tight">Import Existing</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest font-black opacity-60">Manual Phrase Entry</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground opacity-20 group-hover:opacity-60 transition-opacity" />
              </button>
            </motion.div>
          ) : (
            <motion.div key="import" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Secret Phrase</Label>
                <Textarea 
                  placeholder="Enter your 12 or 24 word mnemonic phrase here..."
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  className="min-h-[120px] bg-black/40 backdrop-blur-xl border-white/10 rounded-[2rem] p-5 text-sm leading-relaxed focus-visible:ring-primary text-white shadow-2xl"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs" onClick={() => { setStep('options'); setError(null); }}>Back</Button>
                <Button 
                  className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary shadow-xl shadow-primary/20"
                  onClick={handleImport}
                  disabled={!importInput.trim() || isProcessing}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authorize Import"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-8 flex flex-col items-center gap-3 opacity-20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            <span className="text-[8px] font-black uppercase tracking-widest text-white">Registry Integrity Handshake v7.0</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}