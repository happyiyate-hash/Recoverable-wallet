
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  ShieldCheck, 
  Smartphone, 
  Info,
  ArrowLeft,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * MFA ENFORCEMENT TERMINAL
 * Version: 1.0.0
 * Strictly handles AAL2 upgrades for active sessions.
 */
export default function MfaVerifyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkLevel() {
      if (!supabase) return;
      const { data: challenge } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (challenge?.currentLevel === 'aal2') {
        router.replace('/');
      } else {
        setLoading(false);
      }
    }
    checkLevel();
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || !supabase) return;

    setIsVerifying(true);
    try {
      const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
      if (factorError) throw factorError;

      const totpFactor = factorData.totp.find(f => f.status === 'verified');
      if (!totpFactor) throw new Error("No verified MFA factor found.");
      
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ 
        factorId: totpFactor.id 
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: code,
      });

      if (verifyError) throw verifyError;

      toast({ title: "Identity Verified", description: "Vault upgraded to high-security session." });
      router.replace('/');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Handshake Failed", description: e.message });
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-6 text-foreground relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] -mr-64 -mt-64 rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-10 relative z-10"
      >
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 border border-primary/20 text-primary shadow-2xl relative overflow-hidden">
            <Smartphone className="w-10 h-10 relative z-10" />
            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tight uppercase">MFA Required</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">High-Security Handshake</p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-8">
          <div className="space-y-4">
            <Input 
              type="text"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="h-20 w-full bg-white/5 border border-white/10 rounded-3xl text-center text-5xl font-mono tracking-[0.4em] text-white focus:border-primary outline-none shadow-2xl"
              required
              autoFocus
            />
            <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 flex gap-4 items-center">
              <Info className="w-6 h-6 text-primary shrink-0" />
              <p className="text-[10px] text-primary font-bold uppercase leading-relaxed">
                Enter the 6-digit code from your authenticator app to authorize this terminal session.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              className="w-full h-16 rounded-[2rem] bg-primary font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/20" 
              disabled={code.length !== 6 || isVerifying}
            >
              {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Identity"}
            </Button>
            <Button 
              variant="ghost" 
              type="button" 
              onClick={() => supabase?.auth.signOut().then(() => router.push('/auth/login'))} 
              className="w-full h-12 text-white/20 font-bold uppercase text-[10px]"
            >
              Cancel & Log Out
            </Button>
          </div>
        </form>

        <div className="pt-8 flex items-center justify-center gap-2 opacity-20">
          <ShieldCheck className="w-4 h-4 text-white" />
          <span className="text-[8px] font-black uppercase tracking-widest text-white">Registry Sentinel v4.0 Active</span>
        </div>
      </motion.div>
    </div>
  );
}
