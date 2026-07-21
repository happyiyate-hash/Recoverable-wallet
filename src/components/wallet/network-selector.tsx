'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  Search, 
  CheckCircle2, 
  Copy, 
  ChevronRight, 
  Lock, 
  X, 
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/contexts/wallet-provider';
import type { ChainConfig } from '@/lib/types';
import { cn } from '@/lib/utils';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import GenericCoinIcon from '../icons/GenericCoinIcon';
import { Skeleton } from '../ui/skeleton';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { motion, AnimatePresence } from 'framer-motion';
import AlchemyKeyRequestSheet from './alchemy-key-request-sheet';
import { ScrollArea } from '../ui/scroll-area';
import { useDebounce } from '@/hooks/use-debounce';
import { useIsMobile } from '@/hooks/use-mobile';
import { validateAddressForChain } from '@/lib/wallets/utils';

/**
 * INSTITUTIONAL NETWORK ROW
 * Version: 8.1.0 (Safety Protocol Integrated)
 */
const NetworkRow = React.memo(({
  chain,
  isSelected,
  onSelect,
  address,
  isLocked
}: {
  chain: ChainConfig;
  isSelected: boolean;
  onSelect: (chain: ChainConfig) => void;
  address?: string;
  isLocked: boolean;
}) => {
  const [isCopied, copy] = useCopyToClipboard();
  const themeColor = chain.themeColor || '#818cf8';

  // 🛡️ SAFETY AUDIT: Ensure address matches protocol
  const isResolutionSuccessful = useMemo(() => {
    if (!address) return false;
    return validateAddressForChain(address, chain);
  }, [address, chain]);

  const shortAddress = isResolutionSuccessful && address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}` 
    : 'Node Resolution Failed';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (address && isResolutionSuccessful) copy(address);
  };

  return (
    <div
      onClick={() => onSelect(chain)}
      style={{
        borderColor: !isResolutionSuccessful && address ? 'rgba(239, 68, 68, 0.3)' : isLocked ? `${themeColor}20` : `${themeColor}cc`,
        background: !isResolutionSuccessful && address ? 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(0,0,0,0.6) 100%)' : isLocked 
          ? `linear-gradient(135deg, ${themeColor}05 0%, rgba(0,0,0,0.6) 100%)`
          : `linear-gradient(135deg, ${themeColor}20 0%, rgba(0,0,0,0.3) 100%)`,
        boxShadow: isSelected ? `0 0 30px ${themeColor}20` : 'none'
      }}
      className={cn(
        'w-full flex items-center justify-between py-4 px-5 rounded-[2rem] border transition-all cursor-pointer active:scale-[0.98] group relative overflow-hidden mb-2.5',
        isSelected && isResolutionSuccessful && "border-primary bg-primary/10",
        isLocked && "opacity-60 grayscale-[0.5]"
      )}
      role="button"
    >
      <div className="flex items-center gap-4 relative z-10">
        <div className="p-0.5 rounded-full bg-black/40 border border-white/10 shadow-lg relative">
            <TokenLogoDynamic 
                alt={chain.name} 
                logoUrl={chain.iconUrl}
                size={44}
                chainId={chain.chainId}
                name={chain.name}
                symbol={chain.symbol}
                FallbackComponent={<GenericCoinIcon />}
            />
            {(!isResolutionSuccessful && address) && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-[#050505] shadow-lg animate-pulse">
                <AlertCircle className="w-3 h-3 text-white" />
              </div>
            )}
        </div>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <p className={cn("font-black text-base tracking-tight leading-none", (!isResolutionSuccessful && address) ? "text-red-400" : "text-white")}>
              {chain.name}
            </p>
            <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">{chain.symbol}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <p className={cn(
                "font-mono text-[10px] tracking-tighter transition-colors",
                (!isResolutionSuccessful && address) ? "text-red-400/60" : isCopied ? "text-green-400 opacity-100" : "text-white/40"
            )}>
                {shortAddress}
            </p>
            {isResolutionSuccessful && address && !isLocked && (
                <button 
                    onClick={handleCopy}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors text-primary/60 hover:text-primary"
                >
                    {isCopied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        {!isResolutionSuccessful && address ? (
          <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
        ) : isLocked ? (
          <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/40">
            <Lock className="w-4 h-4" />
          </div>
        ) : (
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300",
            isSelected ? "bg-primary/20 border border-primary/40" : "bg-white/5 border border-white/5 group-hover:bg-white/10"
          )}>
            {isSelected ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : (
              <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
            )}
          </div>
        )}
      </div>

      <div 
        className="absolute -right-10 -top-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"
        style={{ backgroundColor: themeColor }}
      />
    </div>
  );
});

NetworkRow.displayName = 'NetworkRow';

export default function NetworkSelector({ className }: { className?: string }) {
  const { viewingNetwork, setNetwork, isInitialized, allChains, wallets, getAddressForChain, alchemyApiKey } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [isAlchemySheetOpen, setIsAlchemySheetOpen] = useState(false);
  const isMobile = useIsMobile();

  const [inputValue, setInputValue] = useState('');
  const searchTerm = useDebounce(inputValue, 300);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  const handleNetworkSelect = useCallback((newNetwork: ChainConfig) => {
    if (newNetwork.requiresAlchemy && !alchemyApiKey) {
      setIsAlchemySheetOpen(true);
      return;
    }
    setNetwork(newNetwork);
    setIsOpen(false);
    setInputValue(''); 
  }, [alchemyApiKey, setNetwork]);

  const filteredChains = useMemo(() => {
    if (!searchTerm) return allChains;
    const term = searchTerm.toLowerCase();
    return allChains.filter((chain) =>
      chain.name.toLowerCase().includes(term) || 
      chain.symbol.toLowerCase().includes(term)
    );
  }, [allChains, searchTerm]);

  if (!isClient || !isInitialized || !viewingNetwork) {
    return (
      <Button variant="ghost" className={cn('flex items-center gap-1 p-1 h-auto', className)} disabled>
        <Skeleton className="w-6 h-6 rounded-full" />
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  // 🖥️ DESKTOP PILL VARIANT (CENTERED NAVBAR)
  if (!isMobile) {
    return (
      <>
        <button 
          onClick={() => setIsOpen(true)}
          className={cn(
            "flex items-center gap-4 bg-[#111113] border border-primary/20 hover:border-primary/40 px-6 h-11 rounded-[1.5rem] transition-all group shadow-xl active:scale-[0.98]",
            className
          )}
        >
          <TokenLogoDynamic 
            alt={viewingNetwork.name} 
            logoUrl={viewingNetwork.iconUrl}
            size={24}
            chainId={viewingNetwork.chainId}
            name={viewingNetwork.name}
            symbol={viewingNetwork.symbol}
            FallbackComponent={<GenericCoinIcon />}
          />
          <span className="font-black text-[11px] text-white uppercase tracking-[0.2em]">{viewingNetwork.name}</span>
          <ChevronDown className={cn("w-4 h-4 text-primary/40 transition-transform duration-300", isOpen && "rotate-180")} />
        </button>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent 
              side="bottom" 
              className="bg-[#0a0a0c] border-t border-primary/20 rounded-t-[1.5rem] p-0 h-[85vh] overflow-hidden flex flex-col shadow-2xl"
              onOpenAutoFocus={(e) => e.preventDefault()}
              hideCloseButton={true}
          >
            <div className="absolute inset-0 bg-[#0a0a0c]/80 backdrop-blur-3xl -z-10" />
            <div className="flex flex-col h-full relative z-10">
              <div className="w-full flex justify-center py-3 shrink-0"><div className="h-1 w-10 bg-white/20 rounded-full" /></div>
              
              <SheetHeader className="px-6 mb-6 pt-4 shrink-0">
                <SheetTitle className="text-xl font-black uppercase text-center text-white">Select Network</SheetTitle>
                <SheetDescription className="text-center text-[10px] font-black uppercase text-primary tracking-widest opacity-60">Search and select an active blockchain node.</SheetDescription>
              </SheetHeader>

              <div className="px-5 pb-4 shrink-0 space-y-4">
                <div className="relative group bg-zinc-900/50 border border-white/5 rounded-2xl h-16 px-4 shadow-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20" />
                    <Input placeholder="Search networks..." className="w-full h-full bg-transparent border-none pl-10 pr-12 focus-visible:ring-0 text-base placeholder:text-white/20" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
                    <SheetClose asChild><button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 transition-all"><X className="h-5 w-5" /></button></SheetClose>
                </div>
              </div>
              <ScrollArea className="flex-1 px-4 overscroll-contain">
                <div className="space-y-0.5 pb-32 flex flex-col">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {filteredChains.map((chain, index) => (
                        <motion.div key={chain.chainId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: searchTerm ? 0 : index * 0.002, duration: 0.2 }}>
                            <NetworkRow chain={chain} isSelected={viewingNetwork?.chainId === chain.chainId} onSelect={handleNetworkSelect} address={wallets ? getAddressForChain(chain, wallets) : undefined} isLocked={!!chain.requiresAlchemy && !alchemyApiKey} />
                        </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>
        <AlchemyKeyRequestSheet isOpen={isAlchemySheetOpen} onOpenChange={setIsAlchemySheetOpen} />
      </>
    );
  }

  // 📱 MOBILE FALLBACK (SLIM)
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(true)}
        className={cn('flex items-center gap-1 p-1 h-auto hover:bg-white/5 rounded-full transition-all active:scale-95', className)}
      >
        <div className="relative p-0.5 rounded-full bg-white/5 border border-white/5">
            <TokenLogoDynamic 
                alt={viewingNetwork.name} 
                logoUrl={viewingNetwork.iconUrl}
                size={22}
                chainId={viewingNetwork.chainId}
                name={viewingNetwork.name}
                symbol={viewingNetwork.symbol}
                FallbackComponent={<GenericCoinIcon />}
            />
        </div>
        <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
            side="bottom" 
            className="bg-[#0a0a0c] border-t border-primary/20 rounded-t-[1.5rem] p-0 h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            onOpenAutoFocus={(e) => e.preventDefault()}
            hideCloseButton={true}
        >
          <div className="absolute inset-0 bg-[#0a0a0c]/80 backdrop-blur-3xl -z-10" />
          <div className="flex flex-col h-full relative z-10">
            <div className="w-full flex justify-center py-3 shrink-0"><div className="h-1 w-10 bg-white/20 rounded-full" /></div>
            
            <SheetHeader className="px-6 mb-6 pt-4 shrink-0">
              <SheetTitle className="text-xl font-black uppercase text-center text-white">Select Network</SheetTitle>
              <SheetDescription className="text-center text-[10px] font-black uppercase text-primary tracking-widest opacity-60">Search and select an active blockchain network node.</SheetDescription>
            </SheetHeader>

            <div className="px-5 pb-4 shrink-0 space-y-4">
              <div className="relative group bg-zinc-900/50 border border-white/5 rounded-2xl h-16 px-4 shadow-2xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20" />
                  <Input placeholder="Search networks..." className="w-full h-full bg-transparent border-none pl-10 pr-12 focus-visible:ring-0 text-base placeholder:text-white/20" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
                  <SheetClose asChild><button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 transition-all"><X className="h-5 w-5" /></button></SheetClose>
              </div>
            </div>
            <ScrollArea className="flex-1 px-4 overscroll-contain">
              <div className="space-y-0.5 pb-32 flex flex-col">
                <AnimatePresence mode="popLayout" initial={false}>
                  {filteredChains.map((chain, index) => (
                      <motion.div key={chain.chainId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: searchTerm ? 0 : index * 0.002, duration: 0.2 }}>
                          <NetworkRow chain={chain} isSelected={viewingNetwork?.chainId === chain.chainId} onSelect={handleNetworkSelect} address={wallets ? getAddressForChain(chain, wallets) : undefined} isLocked={!!chain.requiresAlchemy && !alchemyApiKey} />
                      </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
      <AlchemyKeyRequestSheet isOpen={isAlchemySheetOpen} onOpenChange={setIsAlchemySheetOpen} />
    </>
  );
}
