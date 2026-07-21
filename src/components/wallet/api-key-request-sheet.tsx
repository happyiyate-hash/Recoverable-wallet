'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/contexts/wallet-provider";
import { KeyRound, Info, Loader2, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { ethers } from 'ethers';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * INSTITUTIONAL API KEY SENTINEL
 * Version: 6.1.2 (Focus Protection Patch)
 */
export default function ApiKeyRequestSheet({ 
  isOpen, 
  onOpenChange 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const { infuraApiKey, setInfuraApiKey, refresh } = useWallet();
  const [keyInput, setKeyInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setKeyInput(infuraApiKey || '');
      setStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen, infuraApiKey]);

  const validateAndSave = async () => {
    if (!keyInput.trim()) return;

    setIsValidating(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${keyInput.trim()}`, undefined, { staticNetwork: true });
      await provider.getBlockNumber();
      
      // ATOMIC CLOUD SYNC: Wait for encryption and server save
      await setInfuraApiKey(keyInput.trim());
      
      setStatus('success');
      setTimeout(() => {
        onOpenChange(false);
        refresh();
      }, 1500);
    } catch (error: any) {
      console.warn("Infura node handshake failed:", error.message);
      setStatus('error');
      setErrorMessage("Invalid API key node. Please check your credentials.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-[3rem] bg-[#0a0a0c] p-8 pt-4 pb-12 border-t border-primary/30 max-h-[500px] shadow-2xl overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()} // 🛡️ FOCUS PROTECTION PROTOCOL
      >
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-flow" />
        
        <SheetHeader className="text-center space-y-4 mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-2 border border-primary/20 text-primary shadow-xl">
            <Zap className="w-8 h-8 animate-pulse" />
          </div>
          <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white">Performance Accelerator</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground leading-relaxed px-6 font-medium uppercase tracking-widest opacity-60">
            Connect a private RPC node (Alchemy/Infura) to unlock institutional-grade performance, instant balance updates, and higher reliability during peak network traffic.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 max-w-sm mx-auto relative z-10">
          <div className="space-y-2">
            <div className="relative group">
              <Input 
                placeholder="Paste your Infura Project ID"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  if (status !== 'idle') setStatus('idle');
                }}
                disabled={isValidating || status === 'success'}
                className={cn(
                  "h-16 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 px-4 text-base font-mono shadow-2xl transition-all",
                  status === 'error' && "border-red-500/50 bg-red-500/5",
                  status === 'success' && "border-green-500/50 bg-green-500/5"
                )}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {isValidating && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
                {status === 'success' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                {status === 'error' && <AlertCircle className="w-6 h-6 text-red-500" />}
              </div>
            </div>
            
            <AnimatePresence>
              {status === 'error' && (
                <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="text-[10px] text-red-500 font-black uppercase tracking-widest pl-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> {errorMessage}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <Button 
            className="w-full h-16 rounded-[2rem] font-black text-sm uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
            onClick={validateAndSave}
            disabled={!keyInput.trim() || isValidating || status === 'success'}
          >
            {isValidating ? 'Authorizing & Syncing...' : 'Authorize & Save'}
          </Button>

          <div className="pt-2 text-center">
            <Link 
              href="https://www.infura.io/register" 
              target="_blank" 
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-primary hover:underline group"
            >
              Get a free key at Infura.io
              <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[8px] text-white/20 uppercase tracking-widest font-black">
          <ShieldCheck className="w-3 h-3 text-primary" />
          Hardware-Encrypted Key Registry Protocol v6.0
        </div>
      </SheetContent>
    </Sheet>
  );
}
