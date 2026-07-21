'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/wallet-provider';
import { useUser } from '@/contexts/user-provider';
import { useCurrency } from '@/contexts/currency-provider';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Copy, 
  Info, 
  CheckCircle2, 
  Loader2, 
  ChevronDown, 
  ShieldCheck,
  Share2,
  MoreVertical,
  Zap,
  ShoppingCart,
  ShieldAlert,
  ShieldOff,
  RefreshCw,
  Handshake,
  X,
  Coins
} from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import type { AssetRow } from '@/lib/types';
import { getAddressForChain, validateAddressForChain } from '@/lib/wallets/utils';
import { cn } from '@/lib/utils';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import QRCode from "react-qr-code";
import GlobalTokenSelector from '@/components/shared/global-token-selector';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

/**
 * INSTITUTIONAL RECEIVE REGISTRY (V11.1 ZERO-STALE)
 * Version: 11.1.0 (Priority Identity Sync)
 */
function ReceiveClient() {
  const { wallets, viewingNetwork, allChains, allAssets, accountNumber, prices } = useWallet();
  const { profile } = useUser();
  const { formatFiat } = useCurrency();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCopied, copy] = useCopyToClipboard();
  
  const [selectedToken, setSelectedToken] = useState<AssetRow | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // Invoice Mode State
  const [amount, setAmount] = useState('');
  const [isAmountModalOpen, setIsAmountModalOpen] = useState(false);

  useEffect(() => {
    const symbol = searchParams.get('symbol');
    const chainId = parseInt(searchParams.get('chainId') || '');
    if (symbol && !isNaN(chainId)) {
        const found = allAssets.find(a => a.symbol === symbol && a.chainId === chainId);
        if (found) { setSelectedToken({ ...found }); return; }
    }
    const initial = allAssets.find(a => a.chainId === viewingNetwork.chainId && a.isNative) || 
                    allAssets.find(a => a.chainId === viewingNetwork.chainId) || 
                    allAssets[0];
    if (initial) setSelectedToken({ ...initial });
  }, [viewingNetwork, allAssets, searchParams]);

  const chain = useMemo(() => allChains.find(c => c.chainId === selectedToken?.chainId) || viewingNetwork, [allChains, selectedToken, viewingNetwork]);
  const address = useMemo(() => wallets ? getAddressForChain(chain, wallets) : null, [chain, wallets]);
  
  const isWnc = selectedToken?.symbol === 'WNC';

  const isAddressValid = useMemo(() => {
    if (isWnc) return !!accountNumber;
    if (!address) return false;
    return validateAddressForChain(address, chain);
  }, [address, chain, isWnc, accountNumber]);

  const qrValue = useMemo(() => {
    if (!isAddressValid) return "";
    const baseAddr = isWnc ? accountNumber : address;
    if (!baseAddr) return "";

    const hasAmount = amount && parseFloat(amount) > 0;

    if (isWnc) {
        let uri = `wnc://pay?account=${accountNumber}&symbol=WNC`;
        if (hasAmount) uri += `&amount=${amount}`;
        return uri;
    }

    if (!hasAmount) return baseAddr;

    const protocol = chain.type === 'btc' ? 'bitcoin' : 
                     chain.type === 'evm' ? 'ethereum' : 
                     chain.type === 'solana' ? 'solana' : 
                     chain.type === 'xrp' ? 'xrpl' : 'pay';

    return `${protocol}:${baseAddr}?amount=${amount}`;
  }, [address, isWnc, accountNumber, isAddressValid, amount, chain]);

  const handleCopy = () => {
    if (!isAddressValid) return;
    const text = isWnc ? accountNumber : address;
    if (text) copy(text);
  };

  const handleShare = async () => {
    if (!isAddressValid) return;
    const text = isWnc ? accountNumber : address;
    if (!text) return;

    const networkName = isWnc ? "SmarterSeller Ledger" : chain.name;
    const shareData = {
      title: `Receive ${selectedToken?.symbol}`,
      text: `Institutional Handshake Requested:\n\nNetwork: ${networkName}\nAsset: ${selectedToken?.symbol}\nAddress: ${text}${amount ? `\nAmount: ${amount}` : ''}`,
      url: window.location.href 
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        copy(text);
      }
    } catch (e) {}
  };

  const livePrice = useMemo(() => {
    if (!selectedToken || !prices) return 0;
    const priceId = (selectedToken.priceId || selectedToken.coingeckoId || selectedToken.address || '').toLowerCase();
    return prices[priceId]?.price || selectedToken.priceUsd || 0;
  }, [selectedToken, prices]);

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white">
      <header className="p-3 flex items-center justify-between bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6 border-b border-white/5 h-14">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl hover:bg-white/5 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white">Receive</h1>
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5">
          <MoreVertical className="w-5 h-5 text-white/20" />
        </Button>
      </header>
      
      <main className="flex-1 p-5 pt-2 space-y-4 overflow-y-auto thin-scrollbar pb-24 max-w-lg mx-auto w-full">
        
        {/* 💳 COMPRESSED QR REGISTRY CARD */}
        <section className="p-5 rounded-[2.5rem] bg-[#0a0a0c] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col items-center gap-3">
            <button 
                onClick={() => setIsSelectorOpen(true)}
                className="flex items-center gap-2 bg-black/40 hover:bg-black/80 px-3 py-1 rounded-full border border-white/10 transition-all active:scale-95 z-10"
            >
                <TokenLogoDynamic 
                    logoUrl={selectedToken?.iconUrl} 
                    alt={selectedToken?.symbol || ''} 
                    size={20} 
                    chainId={selectedToken?.chainId} 
                    symbol={selectedToken?.symbol} 
                    name={selectedToken?.name}
                    priority={true} // FORCE FAST RENDER
                />
                <span className="font-black text-[10px] text-white uppercase tracking-tight">
                    {selectedToken?.symbol} ({chain.name})
                </span>
                <ChevronDown className="w-2.5 h-2.5 text-white/40" />
            </button>

            <div className="relative group">
                <motion.div 
                    initial={{ scale: 0.98 }}
                    animate={{ scale: 1 }}
                    className="bg-white p-4 rounded-[1.5rem] shadow-[0_0_40px_rgba(255,255,255,0.05)] relative overflow-hidden"
                >
                    <AnimatePresence mode="wait">
                      {isAddressValid ? (
                        <motion.div key={qrValue} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <QRCode 
                              value={qrValue} 
                              size={150} 
                              level="H" 
                              fgColor="#000000" 
                              bgColor="#FFFFFF"
                          />
                        </motion.div>
                      ) : (
                        <div className="w-[150px] h-[150px] bg-red-500/5 flex flex-col items-center justify-center gap-3 text-center">
                          <ShieldOff className="w-8 h-8 text-red-500" />
                          <p className="text-[8px] font-black text-red-500 uppercase tracking-widest">Protocol Error</p>
                        </div>
                      )}
                    </AnimatePresence>

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="p-1 bg-white rounded-lg shadow-xl border border-zinc-100">
                            <TokenLogoDynamic 
                              logoUrl={selectedToken?.iconUrl} 
                              size={18} 
                              symbol={selectedToken?.symbol} 
                              name={selectedToken?.name} 
                              chainId={selectedToken?.chainId}
                              priority={true} 
                            />
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="text-center space-y-0.5 w-full z-10 px-4">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">
                    {isWnc ? 'Registry ID' : `${chain.name} Node`}
                </p>
                <div className="flex flex-col items-center justify-center">
                    {isAddressValid ? (
                      <p className="text-[10px] font-mono text-white/60 break-all leading-relaxed tracking-tight max-w-[220px]">
                          {isWnc ? accountNumber : address}
                      </p>
                    ) : (
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Resolution Failed</p>
                    )}
                </div>
            </div>

            {amount && parseFloat(amount) > 0 && (
                <div className="relative z-10 px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center">
                    <p className="text-[7px] font-black text-primary uppercase tracking-[0.2em]">Requesting</p>
                    <p className="text-[11px] font-black text-white">{amount} {selectedToken?.symbol}</p>
                </div>
            )}
        </section>

        {/* 🕹️ COMPACT TRIPLE-ACTION UTILITY ROW */}
        <div className="grid grid-cols-3 gap-2 px-1">
            <UtilityButton icon={Share2} label="Share" onClick={handleShare} disabled={!isAddressValid} />
            <UtilityButton icon={Copy} label="Copy" onClick={handleCopy} disabled={!isAddressValid} active={isCopied} activeLabel="Copied" />
            <UtilityButton icon={Zap} label="Set Amount" onClick={() => isAddressValid && setIsAmountModalOpen(true)} disabled={!isAddressValid} highlight />
        </div>

        <section className="space-y-3 px-1">
            {!isAddressValid ? (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 shadow-2xl">
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                      <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Registry Error</p>
                      <p className="text-[9px] text-red-400/80 leading-relaxed font-medium">
                          Failed to resolve a valid vault node for {chain.name}.
                      </p>
                  </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex gap-3 opacity-60">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
                  <p className="text-[9px] text-white/40 font-bold uppercase leading-relaxed tracking-tight">
                    This address can only receive assets from the {chain.name} network. Sending assets from other nodes may result in permanent loss.
                  </p>
              </div>
            )}

            <Button 
                onClick={() => router.push(`/buy?symbol=${selectedToken?.symbol}&chainId=${selectedToken?.chainId}`)}
                className="w-full h-14 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            >
                <ShoppingCart className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <span>Purchase {selectedToken?.symbol}</span>
            </Button>
        </section>

        <div className="flex items-center justify-center gap-2 opacity-20 pt-2">
          <ShieldCheck className="w-3 h-3 text-primary" strokeWidth={1.5} />
          <span className="text-[8px] font-black uppercase tracking-widest text-white">Registry Sentinel v11.1</span>
        </div>
      </main>

      <GlobalTokenSelector 
        isOpen={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
        onSelect={(token) => { setSelectedToken({ ...token }); setAmount(''); }}
        title="Select Asset"
      />

      {/* 💎 MICRO-POP-UP HANDSHAKE (INVOICE MODE) */}
      <Dialog open={isAmountModalOpen} onOpenChange={setIsAmountModalOpen}>
        <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[380px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-flow" />
            
            <DialogHeader className="items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
                    <Handshake className="w-7 h-7" strokeWidth={1.5} />
                </div>
                <div className="space-y-1">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight text-white">Set Amount</DialogTitle>
                    <DialogDescription className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-60">
                        Institutional Invoice Mode
                    </DialogDescription>
                </div>
            </DialogHeader>

            <div className="mt-8 space-y-8">
                <div className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-2 text-center shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full -mr-12 -mt-12" />
                    <div className="flex items-baseline justify-center gap-3 relative z-10">
                        <Input 
                            type="number" 
                            placeholder="0.00" 
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)}
                            className="text-3xl font-black bg-transparent border-none p-0 h-10 text-center focus-visible:ring-0 tracking-tighter w-full max-w-[180px] text-white"
                            autoFocus
                        />
                        <span className="text-sm font-black text-primary uppercase">{selectedToken?.symbol}</span>
                    </div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest relative z-10">
                        ≈ {formatFiat((parseFloat(amount) || 0) * livePrice)}
                    </p>
                </div>

                <Button 
                    className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
                    onClick={() => setIsAmountModalOpen(false)}
                >
                    Confirm Amount
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UtilityButton({ icon: Icon, label, onClick, disabled, active, activeLabel, highlight }: any) {
    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1.5 p-3 rounded-[1.8rem] border transition-all active:scale-95 shadow-lg group",
                disabled ? "opacity-20 grayscale cursor-not-allowed" : 
                active ? "bg-green-500/10 border-green-500/30" :
                highlight ? "bg-primary/5 border-primary/20" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
            )}
        >
            <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-md",
                active ? "bg-green-500/20 text-green-500" : "bg-black/40 text-primary/60 group-hover:text-primary"
            )}>
                <Icon className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <span className={cn(
                "text-[7px] font-black uppercase tracking-widest text-center leading-none",
                active ? "text-green-500" : "text-white/40 group-hover:text-white/80"
            )}>
                {active ? activeLabel : label}
            </span>
        </button>
    );
}

export default function ReceivePage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#050505]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ReceiveClient />
    </Suspense>
  );
}
