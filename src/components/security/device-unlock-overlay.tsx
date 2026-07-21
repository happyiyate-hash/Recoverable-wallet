
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Delete, ShieldAlert, CheckCircle2, Loader2, Smartphone, Monitor, ShieldCheck, X } from 'lucide-react';
import { useUser } from '@/contexts/user-provider';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { deviceSecurityService } from '@/lib/services/device-security-service';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

/**
 * INSTITUTIONAL SMART DEVICE UNLOCK (MODAL STYLE)
 * Version: 2.0.0 (Persistent Registry Update)
 */
export default function DeviceUnlockOverlay({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const { profile, user, setIsRestricted, refreshProfile } = useUser();
  const { toast } = useToast();
  
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [deviceName] = useState(() => deviceSecurityService.getDeviceName());

  const handleInput = (digit: string) => {
    if (pin.length >= 8 || isVerifying) return;
    setPin(prev => prev + digit);
    setIsError(false);
  };

  useEffect(() => {
    if (pin.length === 8) {
      finalizeVerification();
    }
  }, [pin]);

  const finalizeVerification = async () => {
    if (!profile || !user || isVerifying) return;
    
    setIsVerifying(true);
    try {
      const inputHash = btoa(pin); 
      const savedHash = (profile as any).device_pin_hash;
      
      if (inputHash === savedHash) {
        // Handshake Verified -> Registry Trust
        await deviceSecurityService.trustCurrentDevice(user.id);
        toast({ title: "Device Authorized", description: "Hardware node added to secure registry." });
        
        setIsRestricted(false);
        await refreshProfile();
        onClose();
      } else {
        throw new Error("INVALID_PIN");
      }
    } catch (e) {
      setIsError(true);
      setPin('');
      toast({ variant: "destructive", title: "Access Denied", description: "Incorrect 8-digit Security PIN." });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !isVerifying && !o && onClose()}>
      <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-flow" />
        
        <DialogHeader className="items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
            <Lock className="w-8 h-8" />
          </div>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Authorize Device</DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed">
            Enter 8-digit PIN to link <span className="text-white">{deviceName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-8 space-y-10">
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <motion.div 
                key={i}
                animate={isError ? { x: [-5, 5, -5, 5, 0] } : {}}
                className={cn(
                  "w-3 h-3 rounded-full border-2 transition-all duration-300",
                  pin.length > i 
                    ? "bg-primary border-primary shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
                    : "border-white/10 bg-white/5"
                )}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button 
                key={n} 
                onClick={() => handleInput(n.toString())}
                className="h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-xl font-black text-white hover:bg-white/[0.08] active:scale-90 transition-all shadow-sm"
              >
                {n}
              </button>
            ))}
            <div />
            <button 
              onClick={() => handleInput("0")}
              className="h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-xl font-black text-white hover:bg-white/[0.08] active:scale-90 transition-all shadow-sm"
            >
              0
            </button>
            <button 
              onClick={() => setPin(v => v.slice(0, -1))}
              className="h-16 rounded-2xl flex items-center justify-center text-white/20 hover:text-white active:scale-90 transition-all"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-center gap-2 opacity-20">
          <ShieldCheck className="w-3 h-3" />
          <span className="text-[8px] font-black uppercase tracking-widest">Hardware Registry v2.0 SECURE</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
