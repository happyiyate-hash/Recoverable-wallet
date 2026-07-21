'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/contexts/wallet-provider";
import { Zap, KeyRound, Info, Loader2, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * ALCHEMY KEY REQUEST SHEET
 * Version: 2.0.0 (Cloud Sync Standard)
 */
export default function AlchemyKeyRequestSheet({ 
  isOpen, 
  onOpenChange 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const { alchemyApiKey, setAlchemyApiKey, refresh } = useWallet();
  const [keyInput, setKeyInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      setKeyInput(alchemyApiKey || '');
      setStatus('idle');
    }
  }, [isOpen, alchemyApiKey]);

  const validateAndSave = async () => {
    if (!keyInput.trim()) return;
    setIsValidating(true);
    
    try {
      // Direct Handshake Test via Solana Node
      const res = await fetch(`https://solana-mainnet.g.alchemy.com/v2/${keyInput.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' })
      });
      
      if (!res.ok) throw new Error("Invalid Node");

      // ATOMIC CLOUD SYNC: Wait for encryption and server save
      await setAlchemyApiKey(keyInput.trim());
      
      setStatus('success');
      setTimeout(() => {
        onOpenChange(false);
        refresh();
      }, 1500);
    } catch (e) {
      setStatus('error');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-[2.5rem] bg-[#0a0a0c] p-6 pt-4 pb-10 border-t border-primary/20 max-h-[450px]"
      >
        <SheetHeader className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-primary/20">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <SheetTitle className="text-xl font-black uppercase tracking-tight text-white">Alchemy Multi-Chain Lock</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground leading-relaxed px-4 font-medium uppercase tracking-widest opacity-60">
            This network requires an Alchemy API Key. Your key will be encrypted and saved to your secure cloud vault.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 max-w-sm mx-auto">
          <div className="space-y-2">
            <div className="relative">
              <Input 
                placeholder="Paste Alchemy API Key"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  if (status !== 'idle') setStatus('idle');
                }}
                disabled={isValidating || status === 'success'}
                className={cn(
                  "h-14 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 px-4 text-base font-mono",
                  status === 'success' && "border-green-500/50 focus:border-green-500",
                  status === 'error' && "border-red-500/50"
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidating && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                {status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
              </div>
            </div>
          </div>

          <Button 
            className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest bg-primary shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
            onClick={validateAndSave}
            disabled={!keyInput.trim() || isValidating || status === 'success'}
          >
            {isValidating ? 'Authorizing Node...' : 'Authorize & Save'}
          </Button>

          <div className="pt-2">
            <Link 
              href="https://www.alchemy.com/" 
              target="_blank" 
              className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-primary hover:underline transition-colors group"
            >
              Get a free key at Alchemy.com
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[8px] text-white/20 uppercase tracking-widest font-black">
          <ShieldCheck className="w-3 h-3 text-primary" />
          Hardware-Encrypted Key Registry Protocol v2.0
        </div>
      </SheetContent>
    </Sheet>
  );
}
