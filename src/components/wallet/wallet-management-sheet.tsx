
'use client';

import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "../ui/button";
import { useWallet } from "@/contexts/wallet-provider";
import { useUser } from "@/contexts/user-provider";
import { cn } from "@/lib/utils";
import { 
  Loader2, 
  ShieldCheck, 
  Lock, 
  CloudDownload, 
  Plus, 
  Download, 
  Timer, 
  AlertCircle 
} from 'lucide-react';
import { Textarea } from '../ui/textarea';

interface WalletManagementSheetProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export default function WalletManagementSheet({ isOpen, onOpenChange }: WalletManagementSheetProps) {
  const { generateWallet, importWallet, restoreFromCloud, wallets } = useWallet();
  const { profile, user, activeSessionId } = useUser();
  const [step, setStep] = useState<'start' | 'import'>('start');
  const [importInput, setImportInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

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

  const handleCreate = async () => {
    setIsProcessing(true);
    setError(null);
    setStatus('Syncing Keys...');
    startTimer();
    try {
      await generateWallet();
      setStatus('Complete!');
      setTimeout(() => {
        onOpenChange(false);
      }, 800);
    } catch (e: any) {
      if (e.message === 'CLOUDV_EXISTS') {
          setError("You already have a secret phrase in the cloud. Please retrieve it or delete it manually before creating a new one.");
      } else {
          setStatus('Failed');
          setError(e.message || "Wallet generation failed.");
      }
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        stopTimer();
        if (!error) setStatus('');
      }, 1000);
    }
  };

  const handleImport = async () => {
    setIsProcessing(true);
    setError(null);
    setStatus('Verifying Phrase...');
    startTimer();
    try {
      await importWallet(importInput);
      setStep('start');
      setImportInput('');
      setStatus('Complete!');
      setTimeout(() => {
        onOpenChange(false);
      }, 800);
    } catch (e: any) {
      setStatus('Invalid Phrase');
      setError("Please check your secret phrase and try again.");
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        stopTimer();
        setStatus('');
      }, 1000);
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    setError(null);
    setStatus('Connecting...');
    startTimer();
    
    try {
      // Pass the setStatus function to receive real-time updates from the provider
      await restoreFromCloud(setStatus);
      setStatus('Access Restored!');
      setTimeout(() => {
        onOpenChange(false);
      }, 800);
    } catch (e: any) {
      console.error("Vault restoration error:", e);
      setStatus('Failed');
      setError(e.message || "Cloud restoration failed. Check your connection.");
    } finally {
      setIsProcessing(false);
      stopTimer();
    }
  };

  const hasCloudBackup = !!(profile?.vault_phrase);
  const isUserLoggedIn = !!user;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom"
        className="rounded-t-[2.5rem] bg-[#0a0a0c] p-6 pt-4 pb-8 border-t border-white/5 max-h-[450px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="text-center space-y-1 mb-4">
          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-1">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <SheetTitle className="text-lg font-bold">Secure Your Assets</SheetTitle>
          <div className="mt-2">
            {isProcessing ? (
                <div className="flex items-center justify-center gap-2 text-primary font-mono text-[10px] tracking-tighter">
                    <Timer className="w-3 h-3 animate-pulse" />
                    {(timer / 1000).toFixed(3)}s
                    <span className="ml-1 opacity-60">|</span>
                    <span className="ml-1 uppercase">{status}</span>
                </div>
            ) : (
                <div className="text-xs text-muted-foreground opacity-60">
                    {step === 'import' ? 'Enter secret phrase' : 'Choose a setup method'}
                </div>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-2">
          {error && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex gap-3 animate-in fade-in slide-in-from-top-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-xs text-destructive leading-relaxed font-medium">{error}</p>
              </div>
          )}

          {step === 'start' && (
            <>
              <Button 
                className="w-full h-12 text-sm font-bold rounded-xl gap-3 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/10" 
                onClick={handleCreate}
                disabled={isProcessing}
              >
                {isProcessing && status.includes('Syncing') ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="animate-pulse">Generating...</span>
                    </div>
                ) : (
                    <><Plus className="w-4 h-4" /> Create New Wallet</>
                )}
              </Button>

              <Button 
                variant="secondary"
                className="w-full h-12 text-sm font-bold rounded-xl gap-3 bg-white/5 hover:bg-white/10" 
                onClick={() => setStep('import')}
                disabled={isProcessing}
              >
                <Download className="w-4 h-4" />
                Import Existing Wallet
              </Button>

              {isUserLoggedIn && (
                <Button 
                  variant="outline"
                  className={cn(
                    "w-full h-12 text-sm font-bold rounded-xl gap-3 border-primary/20 text-primary hover:bg-primary/5 shadow-lg shadow-primary/5 transition-all",
                    !hasCloudBackup && "opacity-50 grayscale cursor-not-allowed"
                  )} 
                  onClick={handleRestore}
                  disabled={isProcessing || !hasCloudBackup}
                >
                  {isProcessing && !status.includes('Syncing') ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-[10px] font-mono">{status}</span>
                    </div>
                  ) : (
                    <><CloudDownload className="w-4 h-4" /> Restore from Cloud Vault</>
                  )}
                </Button>
              )}
            </>
          )}

          {step === 'import' && (
            <div className="space-y-3">
              <Textarea 
                placeholder="12 or 24 words..." 
                className="min-h-[80px] rounded-xl p-3 bg-white/5 border-white/10 focus:border-primary/50 text-sm"
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1 h-10 rounded-xl text-xs" onClick={() => { setStep('start'); setError(null); }}>
                  Back
                </Button>
                <Button 
                  className="flex-[2] h-10 rounded-xl font-bold text-xs" 
                  onClick={handleImport}
                  disabled={!importInput || isProcessing}
                >
                  {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Restore Access'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-2 text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
          <ShieldCheck className="w-2.5 h-2.5 text-green-500" />
          Bank-Grade Encryption Active
        </div>
      </SheetContent>
    </Sheet>
  );
}
