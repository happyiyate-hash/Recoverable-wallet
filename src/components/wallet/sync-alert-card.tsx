'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudUpload, ChevronDown, CheckCircle2, Loader2, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/wallet-provider';
import { cn } from '@/lib/utils';

export default function SyncAlertCard() {
  const { isSynced, saveToVault, wallets } = useWallet();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  if (isSynced || !wallets) return null;

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await saveToVault();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="px-6 mb-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/30 overflow-hidden shadow-2xl relative"
      >
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-5 flex items-center justify-between cursor-pointer group active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/20 relative">
              <CloudUpload className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-black animate-pulse" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-white uppercase tracking-tight">Sync Required</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">Vault only stored locally</p>
            </div>
          </div>
          <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform duration-500", isExpanded && "rotate-180")} />
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="px-5 pb-6 overflow-hidden"
            >
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                      Your wallet addresses and secret phrase are stored locally. To enable <span className="text-white font-bold">Cloud Recovery</span> and P2P transfers, sync your vault securely to our encrypted registry.
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full h-12 rounded-xl font-black text-xs uppercase tracking-[0.15em] bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
                >
                  {isSyncing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Encrypting & Syncing...</span>
                    </div>
                  ) : (
                    "Sync To Cloud Now"
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
