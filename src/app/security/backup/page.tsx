'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Loader2, 
  Info,
  ShieldAlert,
  Zap,
  RefreshCw,
  Database,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  Smartphone,
  Cloud,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/wallet-provider';
import { useUser } from '@/contexts/user-provider';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * INSTITUTIONAL FORENSIC AUDIT TERMINAL
 * Version: 7.0.0 (Privacy Hardened - Phrase Removed)
 * 
 * Governance Logic:
 * 1. ZERO-EXPOSURE: Secret phrase node purged. Access moved strictly to Settings.
 * 2. REGISTRY AUDIT: Focuses on 58-chain address synchronization and cloud parity.
 */
export default function BackupPage() {
  const router = useRouter();
  const { profile } = useUser();
  const { 
    saveToVault, 
    wallets, 
    allChains, 
    getAddressForChain, 
    syncDiagnostic, 
    runCloudDiagnostic 
  } = useWallet();
  const { toast } = useToast();

  const [isSyncing, setIsSyncing] = useState(false);

  const vaultedCount = useMemo(() => {
    if (!wallets || !allChains || !profile) return 0;
    
    return allChains.filter(chain => {
      const localAddr = getAddressForChain(chain, wallets);
      const chainType = chain.type || 'evm';
      const fieldName = `${chainType}_address`;
      const cloudAddr = (profile as any)[fieldName];
      return cloudAddr && localAddr && cloudAddr.toLowerCase() === localAddr.toLowerCase();
    }).length;
  }, [wallets, allChains, profile, getAddressForChain]);

  const registryNodes = useMemo(() => {
    if (!wallets || !allChains || !profile) return [];

    return allChains.map(chain => {
      const localAddr = getAddressForChain(chain, wallets);
      const chainType = chain.type || 'evm';
      const fieldName = `${chainType}_address`;
      const cloudAddr = (profile as any)[fieldName];

      const isSynced = cloudAddr && localAddr && cloudAddr.toLowerCase() === localAddr.toLowerCase();
      const isCurrentErrorNode = syncDiagnostic.status === 'error_missing_column' && syncDiagnostic.chain === chain.name;

      return {
        name: chain.name,
        symbol: chain.symbol,
        iconUrl: chain.iconUrl,
        chainId: chain.chainId,
        localAddr,
        isSynced,
        hasColumnError: isCurrentErrorNode
      };
    });
  }, [wallets, allChains, profile, getAddressForChain, syncDiagnostic]);

  const isFullySynced = vaultedCount === registryNodes.length && vaultedCount > 0;

  const handleCloudSync = async () => {
    setIsSyncing(true);
    try {
      await saveToVault();
      await runCloudDiagnostic(true);
      toast({ title: "Audit Authorized", description: "Registry synchronization initialized." });
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed" });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white overflow-hidden">
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white">Registry Hub</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <ShieldCheck className="w-2.5 h-2.5 text-primary" />
            <span className="text-[8px] text-primary font-black uppercase tracking-tighter">Forensic Audit Node</span>
          </div>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col min-h-0 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="px-6 py-8 space-y-8 flex-1 overflow-y-auto thin-scrollbar">
          
          {/* 📊 GLOBAL SYNCHRONIZATION STATUS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Vault Integrity</p>
                <div className={cn(
                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-lg flex items-center gap-1.5",
                    isFullySynced ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                )}>
                  <Cloud className="w-3 h-3" />
                  <span>{isFullySynced ? 'Registry: Synchronized' : 'Status: Out of Sync'}</span>
                </div>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl relative overflow-hidden flex items-center justify-between">
                <div className="space-y-1 relative z-10">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Hardware Mappings</p>
                    <h2 className="text-4xl font-black text-white tabular-nums">{vaultedCount} <span className="text-sm text-white/20">/ {registryNodes.length}</span></h2>
                </div>
                <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-white/5 flex items-center justify-center">
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-full border-t-4 border-primary"
                            style={{ opacity: isFullySynced ? 1 : 0.4 }}
                        />
                        <ShieldCheck className={cn("w-8 h-8 transition-colors duration-1000", isFullySynced ? "text-primary" : "text-white/20")} />
                    </div>
                </div>
            </div>
          </section>

          <AnimatePresence>
            {(syncDiagnostic.status === 'checking' || syncDiagnostic.status === 'syncing' || syncDiagnostic.status === 'error_missing_column') && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-2">
                <div className={cn(
                    "p-5 rounded-[2rem] border flex items-center justify-between shadow-xl transition-colors duration-500",
                    syncDiagnostic.status === 'error_missing_column' ? "bg-red-500/10 border-red-500/30" : "bg-primary/5 border-primary/20"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                        syncDiagnostic.status === 'error_missing_column' ? "bg-red-500/20 text-red-500" : "bg-primary/10 text-primary"
                    )}>
                      {syncDiagnostic.status === 'error_missing_column' ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <Loader2 className="w-5 h-5 animate-spin" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-white tracking-widest">
                        {syncDiagnostic.status === 'error_missing_column' ? 'Registry Conflict' : `Auditing: ${syncDiagnostic.chain || 'Global nodes'}`}
                      </p>
                      <p className={cn("text-[8px] font-bold uppercase mt-0.5", syncDiagnostic.status === 'error_missing_column' ? "text-red-400" : "text-primary/60")}>
                        {syncDiagnostic.status === 'error_missing_column' ? 'Missing Database Column' : 'Synchronizing Identity Registry...'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <section className="space-y-4">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] px-2">Public Address Mapping</p>
            
            <div className="space-y-2 pb-24">
              {registryNodes.map((node, i) => (
                <div 
                  key={`${node.chainId}-${node.symbol}`}
                  className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all shadow-lg"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <TokenLogoDynamic 
                      logoUrl={node.iconUrl} 
                      size={32} 
                      chainId={node.chainId} 
                      symbol={node.symbol} 
                      name={node.name}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-white uppercase truncate">{node.name}</p>
                        <span className="text-[8px] text-white/20 font-mono">{node.symbol}</span>
                      </div>
                      <p className="text-[9px] font-mono text-white/30 truncate max-w-[160px] mt-0.5">{node.localAddr || 'Unresolved'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <AnimatePresence mode="wait">
                      {node.hasColumnError ? (
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
                           <AlertCircle className="w-3 h-3" />
                           <span className="text-[7px] font-black uppercase">Column Error</span>
                        </motion.div>
                      ) : node.isSynced ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-green-500">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Vaulted</span>
                        </motion.div>
                      ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-amber-500/60">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Local Only</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/95 to-transparent backdrop-blur-md z-40">
            <div className="max-w-lg mx-auto">
                <Button 
                    onClick={handleCloudSync}
                    disabled={isSyncing || isFullySynced}
                    className={cn(
                        "w-full h-18 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.1em] shadow-2xl transition-all border-b-8",
                        isFullySynced ? "bg-white/5 border-white/10 text-white/40" : "bg-primary hover:bg-primary/90 border-primary/50 text-white shadow-primary/20"
                    )}
                >
                    {isSyncing ? (
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>Vaulting Registry...</span>
                        </div>
                    ) : isFullySynced ? (
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-6 h-6 text-green-500" />
                            <span>Full Registry Protected</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Cloud className="w-6 h-6 fill-current" />
                            <span>Authorize Cloud Backup</span>
                        </div>
                    )}
                </Button>
            </div>
        </div>
      </main>
    </div>
  );
}
