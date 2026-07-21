'use client';

import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useWallet } from '@/contexts/wallet-provider';
import { useMarket } from '@/contexts/market-provider';
import { Search, Loader2, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import type { AssetRow } from '@/lib/types';
import { getInitialAssets } from '@/lib/wallets/balances';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface TokenManagerProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

/**
 * INSTITUTIONAL ASSET MANAGER
 * Version: 7.0.0 (Strict Network Scoping)
 * 
 * Logic Node:
 * - Only displays tokens for the active viewingNetwork.
 */
export default function TokenManager({ isOpen, onOpenChange }: TokenManagerProps) {
  const router = useRouter();
  const { viewingNetwork, hiddenTokenKeys, toggleTokenVisibility, addUserToken, userAddedTokens, refresh } = useWallet();
  const { discoveredTokens } = useMarket();
  const [searchTerm, setSearchTerm] = useState('');

  const mergedTokens = useMemo(() => {
    if (!viewingNetwork) return [];
    
    // 🛡️ STRICT REGISTRY FILTERING: Only show tokens for the active network node
    const chainId = viewingNetwork.chainId;

    // 1. HARDCODED REGISTRY ASSETS (Filtered)
    const hardcoded = getInitialAssets(chainId).map(a => ({
        ...a,
        balance: '0'
    } as AssetRow));

    // 2. DISCOVERED BACKGROUND ASSETS (Filtered)
    const backgroundDiscovered = discoveredTokens.filter(t => t.chainId === chainId);

    // 3. MANUALLY ADDED USER NODES (Filtered)
    const manualNodes = userAddedTokens.filter(t => t.chainId === chainId);

    const combined = [...hardcoded, ...backgroundDiscovered, ...manualNodes];
    
    // Deduplication using specific node-type identifiers
    return combined.reduce((acc, curr) => {
        const id = curr.isNative 
            ? `native:${curr.symbol}` 
            : `token:${curr.address?.toLowerCase() || curr.symbol}`;
            
        if (!acc.find(t => {
            const existingId = t.isNative ? `native:${t.symbol}` : `token:${t.address?.toLowerCase() || t.symbol}`;
            return existingId === id;
        })) {
            acc.push(curr);
        }
        return acc;
    }, [] as AssetRow[]);
  }, [viewingNetwork, discoveredTokens, userAddedTokens]);

  const filteredTokens = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return mergedTokens.filter(t => 
        t.name.toLowerCase().includes(term) || 
        t.symbol.toLowerCase().includes(term) ||
        (t.address && t.address.toLowerCase().includes(term))
    );
  }, [mergedTokens, searchTerm]);

  const handleToggle = async (token: AssetRow, checked: boolean) => {
    const key = `${viewingNetwork.chainId}:${token.symbol}`;
    const isAdded = userAddedTokens.some(t => t.chainId === viewingNetwork.chainId && t.symbol === token.symbol);

    if (checked) {
        if (!token.isNative && !isAdded) {
            addUserToken({
                ...token,
                balance: '0',
                updatedAt: Date.now()
            });
        }
        if (hiddenTokenKeys.has(key)) {
            toggleTokenVisibility(viewingNetwork.chainId, token.symbol);
        }
        setTimeout(() => refresh(), 100);
    } else {
        if (!hiddenTokenKeys.has(key)) {
            toggleTokenVisibility(viewingNetwork.chainId, token.symbol);
        }
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" hideCloseButton={true} className="bg-[#0a0a0c] border-t border-primary/20 rounded-t-[3.5rem] p-0 h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black/80 -z-10" />

        <div className="flex flex-col h-full relative z-10">
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-4 shrink-0" />
            
            <SheetHeader className="px-6 mb-4">
              <SheetTitle className="text-2xl font-black uppercase tracking-widest text-center">Asset Discovery</SheetTitle>
              <SheetDescription className="text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                {viewingNetwork?.name} Registry Nodes
              </SheetDescription>
            </SheetHeader>

            <div className="px-6 mb-6">
                <div className="relative group bg-white/5 border border-white/10 rounded-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search asset or contract..."
                      className="w-full h-14 bg-transparent border-none pl-11 pr-12 rounded-2xl focus-visible:ring-0 text-base"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <button 
                            onClick={() => { setSearchTerm(''); onOpenChange(false); }}
                            className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1 px-6">
              <div className="space-y-2 pb-32">
                <AnimatePresence mode="popLayout">
                    {filteredTokens.map((token, index) => {
                        const key = `${viewingNetwork.chainId}:${token.symbol}`;
                        const isAdded = userAddedTokens.some(t => t.chainId === viewingNetwork.chainId && t.symbol === token.symbol);
                        const isHidden = hiddenTokenKeys.has(key);
                        const isOn = (token.isNative || isAdded) && !isHidden;

                        return (
                            <motion.div 
                                key={token.isNative ? `native-${token.symbol}` : `token-${token.address || token.symbol}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: index * 0.01 }}
                                className="flex items-center justify-between p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <TokenLogoDynamic 
                                        logoUrl={token.iconUrl} 
                                        alt={token.symbol} 
                                        size={44} 
                                        chainId={token.chainId} 
                                        symbol={token.symbol} 
                                        name={token.name} 
                                    />
                                    <div className="text-left">
                                        <p className="font-bold text-base text-white">{token.symbol}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-40">
                                            {token.isNative ? 'Native Gas Node' : token.name}
                                        </p>
                                    </div>
                                </div>
                                <Switch 
                                    checked={isOn} 
                                    onCheckedChange={(checked) => handleToggle(token, checked)} 
                                    className="data-[state=checked]:bg-primary" 
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {filteredTokens.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-20">
                        <X className="w-12 h-12 mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest">No Nodes Found</p>
                    </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-6 pt-2 shrink-0 border-t border-white/5 bg-[#0a0a0c]/50 backdrop-blur-xl">
                <Button 
                    onClick={() => { onOpenChange(false); router.push('/tokens/add'); }}
                    className="w-full h-12 bg-black border border-white/10 hover:bg-white/5 text-white rounded-xl flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4 text-primary" />
                    <span>Import Custom Node</span>
                </Button>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}