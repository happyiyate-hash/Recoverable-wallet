
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { defiService } from '@/lib/services/defi-service';
import type { YieldPool } from '@/lib/types';
import { 
  TrendingUp, 
  Zap, 
  ChevronRight, 
  Loader2, 
  ShieldCheck,
  Building2,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWallet } from '@/contexts/wallet-provider';
import { useToast } from '@/hooks/use-toast';
import { ethers } from 'ethers';

export default function DeFiTab() {
  const { wallets, infuraApiKey, allChainsMap } = useWallet();
  const { toast } = useToast();
  const [pools, setPools] = useState<YieldPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSupplying, setIsSupplying] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const data = await defiService.fetchTopYields();
      setPools(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleSupply = async (pool: YieldPool) => {
    if (!wallets || !infuraApiKey) {
        toast({ title: "Auth Required", description: "Please establish your vault node first." });
        return;
    }

    setIsSupplying(pool.id);
    try {
        const evmWallet = wallets.find(w => w.type === 'evm');
        if (!evmWallet?.privateKey) throw new Error("Signing authority missing.");

        const provider = new ethers.JsonRpcProvider(allChainsMap[1].rpcUrl.replace('{API_KEY}', infuraApiKey));
        const signer = new ethers.Wallet(evmWallet.privateKey, provider);

        // Standard supply interaction (Using a placeholder for the demo)
        const tokenAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT Example
        const success = await defiService.supplyToAave(tokenAddress, "10", signer);

        if (success) {
            toast({ title: "Supply Authorized", description: `Successfully deposited into ${pool.project}.` });
        }
    } catch (e: any) {
        toast({ 
            variant: "destructive", 
            title: "Handshake Failed", 
            description: e.message || "Institutional supply protocol interrupted." 
        });
    } finally {
        setIsSupplying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest">Auditing Liquidity Nodes...</p>
      </div>
    );
  }

  return (
    <div className="px-2 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section className="p-6 rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary fill-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Growth Protocol Active</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Cloud Earning</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Stake your idle node assets to earn predictable daily yields via institutional liquidity pools.</p>
          </div>
          <Button className="h-12 px-6 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">
            Start Earning
          </Button>
        </div>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary/10 blur-3xl rounded-full" />
      </section>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Verified Yields</p>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-green-500" />
            <span className="text-[8px] font-black text-green-500 uppercase">Aave V3 Nodes</span>
          </div>
        </div>

        <div className="space-y-2 pb-32">
          {pools.map((pool, i) => (
            <motion.div 
              key={pool.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between hover:bg-white/[0.04] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center relative shadow-lg">
                  <span className="font-black text-sm text-primary">{pool.symbol[0]}</span>
                  <div className="absolute -bottom-1 -right-1 p-1 bg-zinc-900 rounded-lg border border-white/10">
                    <Building2 className="w-2.5 h-2.5 text-white/40" />
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-black text-sm text-white tracking-tight">{pool.symbol}</p>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">
                    {pool.project} • {pool.chain}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-black text-green-400 tabular-nums">+{pool.apy.toFixed(2)}%</p>
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-tighter">Current APY</p>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleSupply(pool)}
                    className="rounded-xl hover:bg-primary/10"
                    disabled={isSupplying === pool.id}
                >
                    {isSupplying === pool.id ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-primary transition-colors" />}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
