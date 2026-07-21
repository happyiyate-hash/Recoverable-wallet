'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Lock, 
  Loader2, 
  LifeBuoy, 
  Delete, 
  CheckCircle2, 
  ShieldCheck,
  Zap,
  Clock,
  UserX,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/user-provider';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { monitoringService } from '@/lib/services/monitoring-service';
import { securityIntelligence } from '@/lib/services/security-intelligence';
import { deviceSecurityService } from '@/lib/services/device-security-service';

/**
 * INSTITUTIONAL REGISTRY LOCKDOWN TERMINAL
 * Version: 6.0.0 (Stealth Delay Standard)
 */
function LockdownContent() {
  const router = useRouter();
  const { profile, user, refreshProfile } = useUser();
  const { toast } = useToast();
  
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const attempts = profile?.pin_attempts || 0;
  const isHardLocked = attempts >= 6 || profile?.security_locked;
  const isSoftLocked = attempts >= 3 && attempts < 6;

  // 🛡️ STEALTH PROTECTION: Add fake delay for high-risk profiles
  const isHighRisk = (profile?.risk_score || 0) > 10;

  useEffect(() => {
    if (isSoftLocked) {
      const lockUntil = profile?.pin_locked_until ? new Date(profile.pin_locked_until).getTime() : 0;
      const now = Date.now();
      const diff = Math.ceil((lockUntil - now) / 1000);
      
      if (diff > 0) {
        setCooldownRemaining(diff);
        const timer = setInterval(() => {
          setCooldownRemaining(prev => prev <= 1 ? 0 : prev - 1);
        }, 1000);
        return () => clearInterval(timer);
      }
    }
  }, [isSoftLocked, profile?.pin_locked_until]);

  const handleInput = (digit: string) => {
    if (pin.length >= 8 || isUnlocking || isHardLocked || cooldownRemaining > 0) return;
    setPin(prev => prev + digit);
    setIsError(false);
  };

  const finalizeUnlock = useCallback(async () => {
    if (!profile || !user || isUnlocking) return;
    
    setIsUnlocking(true);
    
    // 🛡️ STEALTH PROTECTION: Wait for 2.5s if risk is high
    if (isHighRisk) {
      await new Promise(r => setTimeout(r, 2500));
    }

    try {
      const inputHash = btoa(pin);
      const savedHash = (profile as any).device_pin_hash;
      
      if (inputHash !== savedHash) throw new Error("INVALID_PIN");

      // 🏆 SUCCESS HANDSHAKE: Training behavior node
      await supabase!.rpc('reset_pin_attempts', { p_user_id: user.id });
      await supabase!.from('profiles').update({ 
        security_locked: false,
        risk_score: 0 
      }).eq('id', user.id);
      
      const fingerprint = await deviceSecurityService.generateFingerprint();
      await securityIntelligence.trainBehaviorNode(user.id, { 
        hash: fingerprint,
        location: profile.country_code
      });
      
      toast({ title: "Registry Restored", description: "Behavior node synchronized." });
      await refreshProfile();
      setTimeout(() => router.replace('/'), 500);

    } catch (e) {
      setIsError(true);
      setPin('');
      
      await supabase!.rpc('increment_pin_attempts', { p_user_id: user.id });
      await supabase!.rpc('update_risk_score', { p_user_id: user.id, p_delta: 5 });

      if (attempts + 1 >= 6) {
        await supabase!.from('profiles').update({ security_locked: true }).eq('id', user.id);
        await monitoringService.createAlert(user.id, 'brute_force_detected', 'high', 'Identity Node: Brute-force threshold met.');
      }

      await refreshProfile();
      setIsUnlocking(false);
    }
  }, [pin, profile, user, attempts, toast, refreshProfile, router, isHighRisk]);

  useEffect(() => {
    if (pin.length === 8) finalizeUnlock();
  }, [pin, finalizeUnlock]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-8 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.05)_0%,transparent_70%)] pointer-events-none" />
      
      <AnimatePresence mode="wait">
        {isHardLocked ? (
          <motion.div key="hard-lock" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm w-full space-y-8 relative z-10">
            <div className="w-24 h-24 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 shadow-2xl relative">
              <UserX className="w-12 h-12" />
              <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 border-4 border-[#050505]">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-black uppercase tracking-tight text-white">Identity Gated</h1>
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] text-red-400 font-black uppercase tracking-[0.2em] bg-red-500/10 py-1.5 px-4 rounded-full border border-red-500/20">
                  Critical Behavioral Anomaly
                </p>
                <p className="text-[8px] text-white/40 uppercase font-bold tracking-widest">Risk Score: {(profile?.risk_score || 0)}/11</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed px-6 font-medium">
              Significant suspicious patterns detected. PIN entry is temporarily disabled. Please authorize via Liaison Protocol.
            </p>
            <Button onClick={() => router.push('/support?type=appeal')} className="w-full h-16 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 font-black uppercase text-xs tracking-widest text-white gap-3">
              <LifeBuoy className="w-4 h-4 text-primary" /> Enter Appeal Protocol
            </Button>
          </motion.div>
        ) : (
          <motion.div key="pin-entry" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-sm w-full space-y-10">
            <div className="space-y-6">
              <div className="w-24 h-24 rounded-[2.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary shadow-2xl relative overflow-hidden">
                {isUnlocking ? <Loader2 className="w-12 h-12 animate-spin text-primary" /> : <Lock className="w-12 h-12" />}
                {cooldownRemaining > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <Clock className="w-10 h-10 text-primary animate-pulse" />
                  </motion.div>
                )}
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black uppercase tracking-tight text-white">Registry Lock</h1>
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] py-1.5 px-4 rounded-full w-fit mx-auto border",
                  isHighRisk ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-primary/10 border-primary/20 text-primary"
                )}>
                  {cooldownRemaining > 0 ? `RETRY IN ${cooldownRemaining}S` : isHighRisk ? 'ADAPTIVE SECURITY ACTIVE' : 'IDENTITY HANDSHAKE'}
                </p>
              </div>
            </div>

            <div className="space-y-10">
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <motion.div 
                    key={i}
                    animate={isError ? { x: [-5, 5, -5, 5, 0] } : {}}
                    className={cn(
                      "w-3 h-3 rounded-full border-2 transition-all duration-300",
                      pin.length > i ? "bg-primary border-primary shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "border-white/10 bg-white/5"
                    )}
                  />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button key={n} onClick={() => handleInput(n.toString())} className="h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-xl font-black text-white hover:bg-white/[0.08] active:scale-90 transition-all shadow-sm">{n}</button>
                ))}
                <div />
                <button onClick={() => handleInput("0")} className="h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-xl font-black text-white hover:bg-white/[0.08] active:scale-90 transition-all shadow-sm">0</button>
                <button onClick={() => setPin(v => v.slice(0, -1))} className="h-16 rounded-2xl flex items-center justify-center text-white/20 hover:text-white active:scale-90 transition-all"><Delete className="w-6 h-6" /></button>
              </div>
            </div>

            <button onClick={() => router.push('/support?type=appeal')} className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-primary transition-all">Identity Liaison</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-12 left-0 right-0 opacity-20 flex flex-col items-center gap-2">
        <div className="h-px w-8 bg-white/40" />
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-primary fill-primary" />
          <span className="text-[8px] font-black uppercase tracking-[0.4em]">Risk Engine v2.0 Active</span>
        </div>
      </div>
    </div>
  );
}

export default function LockdownPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-black"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LockdownContent />
    </Suspense>
  );
}
