'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  ChevronDown, 
  ImageIcon, 
  Zap, 
  CheckCircle2,
  AlertCircle,
  Cpu,
  Plus,
  Search,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/contexts/wallet-provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ethers } from 'ethers';
import { getDirectLogoUrl, getTokenLogoUnified } from '@/lib/getTokenLogo';
import { getInitialAssets } from '@/lib/wallets/balances';
import { COINGECKO_PLATFORM_MAP } from '@/lib/coingecko';
import CandleChart from '@/components/CandleChart';

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)"
];

/**
 * INSTITUTIONAL CUSTOM TOKEN DISCOVERY TERMINAL
 * Version: 9.0.0 (Persistent Batch Import Standard)
 */
export default function AddTokenPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { allChains, viewingNetwork, addUserToken, userAddedTokens, refresh, infuraApiKey } = useWallet();

  const [selectedChain, setSelectedChain] = useState(viewingNetwork);
  const [contractAddress, setContractAddress] = useState('');
  
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState('18');
  const [totalSupply, setTotalSupply] = useState('');
  
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coingeckoId, setCoingeckoId] = useState<string | undefined>(undefined);
  const [priceUsd, setPriceUsd] = useState<number | undefined>(undefined);
  const [priceChange24h, setPriceChange24h] = useState<number | undefined>(undefined);

  const [isFetching, setIsFetching] = useState(false);
  const [discoveryPhase, setDiscoveryPhase] = useState<'IDLE' | 'SCANNING' | 'RPC' | 'MARKET' | 'COMPLETE' | 'ERROR'>('IDLE');
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isChainSheetOpen, setIsChainSheetOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function resolveMetadata() {
      const cleanAddr = contractAddress.trim();
      if (cleanAddr.length >= 42 && cleanAddr.startsWith('0x')) {
        setIsFetching(true);
        setDiscoveryPhase('SCANNING');
        setDiscoveryError(null);
        
        try {
          let detectedChain = null;
          let foundOnChain = false;

          // 1. AUTO-DETECT NETWORK NODES
          for (const chain of allChains) {
            if (!chain.rpcUrl) continue;
            try {
              const rpc = chain.rpcUrl.replace('{API_KEY}', infuraApiKey || '');
              const provider = new ethers.JsonRpcProvider(rpc, undefined, { staticNetwork: true });
              const code = await provider.getCode(cleanAddr).catch(() => "0x");
              if (code && code !== "0x") {
                detectedChain = chain;
                setSelectedChain(chain);
                foundOnChain = true;
                break;
              }
            } catch (e) {}
          }

          if (!foundOnChain) {
            setDiscoveryPhase('ERROR');
            setDiscoveryError("Registry Error: Node not found on any verified network.");
            setIsFetching(false);
            return;
          }

          // 2. RPC TECHNICAL AUDIT
          setDiscoveryPhase('RPC');
          const finalRpc = detectedChain!.rpcUrl.replace('{API_KEY}', infuraApiKey || '');
          const provider = new ethers.JsonRpcProvider(finalRpc, undefined, { staticNetwork: true });
          const contract = new ethers.Contract(cleanAddr, ERC20_ABI, provider);

          const [rpcName, rpcSymbol, rpcDecimals, rpcTotal] = await Promise.all([
            contract.name().catch(() => ''),
            contract.symbol().catch(() => ''),
            contract.decimals().catch(() => 18),
            contract.totalSupply().catch(() => 0)
          ]);

          if (rpcName || rpcSymbol) {
            setName(rpcName);
            setSymbol(rpcSymbol.toUpperCase());
            setDecimals(rpcDecimals.toString());
            setTotalSupply(rpcTotal.toString());
          } else {
            throw new Error("Invalid RPC Node Response");
          }

          // 3. MARKET & LOGO SYNC
          setDiscoveryPhase('MARKET');
          
          try {
            const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${cleanAddr}`);
            if (dexRes.ok) {
              const dexData = await dexRes.json();
              if (dexData.pairs && dexData.pairs.length > 0) {
                const primaryPair = dexData.pairs[0];
                if (primaryPair.priceUsd) setPriceUsd(parseFloat(primaryPair.priceUsd));
                if (primaryPair.priceChange?.h24) setPriceChange24h(primaryPair.priceChange.h24);
                if (primaryPair.info?.imageUrl && !logoUrl) setLogoUrl(primaryPair.info.imageUrl);
              }
            }
          } catch (e) {}

          const platform = COINGECKO_PLATFORM_MAP[detectedChain!.chainId] || 'ethereum';
          try {
            const cgRes = await fetch(`https://api.coingecko.com/api/v3/coins/${platform}/contract/${cleanAddr.toLowerCase()}`);
            if (cgRes.ok) {
              const data = await cgRes.json();
              if (data.market_data?.current_price?.usd && !priceUsd) setPriceUsd(data.market_data.current_price.usd);
              if (data.market_data?.price_change_percentage_24h && !priceChange24h) setPriceChange24h(data.market_data.price_change_percentage_24h);
              setCoingeckoId(data.id);
              if (data.image?.large && !logoUrl) setLogoUrl(data.image.large);
            }
          } catch (e) {}

          if (!logoUrl) {
            const unifiedLogo = await getTokenLogoUnified(detectedChain!.chainId, cleanAddr, rpcName || rpcSymbol, rpcSymbol);
            if (unifiedLogo) setLogoUrl(unifiedLogo);
          }
          
          setDiscoveryPhase('COMPLETE');
        } catch (e: any) {
          setDiscoveryPhase('ERROR');
          setDiscoveryError("Technical Handshake Failed. Verify the contract address.");
        } finally {
          setIsFetching(false);
        }
      } else {
        setDiscoveryPhase('IDLE');
        setDiscoveryError(null);
      }
    }
    
    const timeout = setTimeout(resolveMetadata, 600); 
    return () => clearTimeout(timeout);
  }, [contractAddress, infuraApiKey, allChains]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setContractAddress('');
    setName('');
    setSymbol('');
    setDecimals('18');
    setTotalSupply('');
    setLogoUrl(null);
    setCoingeckoId(undefined);
    setPriceUsd(undefined);
    setPriceChange24h(undefined);
    setDiscoveryPhase('IDLE');
    setDiscoveryError(null);
    setIsFetching(false);
  };

  const handleSave = async () => {
    if (!contractAddress || !name || !symbol) return;

    const cleanAddr = contractAddress.toLowerCase().trim();
    const cleanSym = symbol.toUpperCase().trim();
    
    const initialAssets = getInitialAssets(selectedChain.chainId);
    const isDuplicate = [...initialAssets, ...userAddedTokens].some(a => 
      a.address?.toLowerCase() === cleanAddr && a.chainId === selectedChain.chainId
    );

    if (isDuplicate) {
      toast({ variant: "destructive", title: "Registry Collision", description: "This cryptocurrency already exists in your vault registry." });
      return;
    }

    setIsSaving(true);
    try {
      addUserToken({
        chainId: selectedChain.chainId,
        address: cleanAddr,
        symbol: cleanSym,
        name: name,
        decimals: parseInt(decimals),
        iconUrl: logoUrl,
        coingeckoId: coingeckoId,
        balance: '0',
        priceUsd: priceUsd,
        isNative: false
      });

      toast({ title: "Node Registered", description: `${symbol} added to your vault.` });
      
      // ✅ PERSISTENCE: Wait for refresh then reset inputs but STAY on page
      await refresh();
      resetForm();
    } catch (e) {
      toast({ variant: "destructive", title: "Handshake Failed", description: "Could not authorize token node." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-foreground relative overflow-hidden">
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50 px-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-xs font-black uppercase tracking-[0.2em] leading-none text-white">Import Node</h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Cpu className="w-2.5 h-2.5 text-primary" />
            <span className="text-[8px] text-primary font-black uppercase tracking-tighter">Registry Protocol v9.0</span>
          </div>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full pb-40 overflow-y-auto thin-scrollbar relative z-10">
        
        <section className="space-y-3">
          <Label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Network Authority</Label>
          <button onClick={() => setIsChainSheetOpen(true)} className="w-full flex items-center justify-between p-5 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-all group shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <TokenLogoDynamic logoUrl={selectedChain.iconUrl} alt={selectedChain.name} size={32} chainId={selectedChain.chainId} symbol={selectedChain.symbol} name={selectedChain.name} />
              <p className="font-black text-sm text-white uppercase tracking-tight">{selectedChain.name}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        </section>

        <section className="space-y-3">
          <div className="flex justify-between items-center px-2">
            <Label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Contract Node</Label>
            <AnimatePresence mode="wait">
                {isFetching && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-[8px] font-black uppercase text-primary animate-pulse">
                            {discoveryPhase === 'SCANNING' ? 'Locating Node...' : discoveryPhase === 'RPC' ? 'Auditing RPC...' : 'Syncing Registry...'}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>
          <div className="relative group">
            <div className="absolute -inset-1 bg-primary/10 rounded-[2rem] blur opacity-25 group-focus-within:opacity-100 transition-opacity" />
            <Input placeholder="Paste 0x contract address" value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} className="relative h-16 bg-black/60 border-white/10 rounded-[2rem] px-6 text-sm font-mono focus-visible:ring-primary shadow-2xl text-white" />
          </div>
          
          <AnimatePresence>
            {discoveryError && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-[10px] font-black text-red-500 uppercase leading-relaxed">{discoveryError}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <AnimatePresence>
          {discoveryPhase === 'COMPLETE' && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="p-6 rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-white/[0.02] to-black/40 border border-white/10 shadow-2xl space-y-6 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-md">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[8px] font-black uppercase text-primary tracking-widest">Verified Node</span>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-[2rem] bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl group-hover:scale-105 transition-transform">
                  {logoUrl ? (
                    <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-white/10" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">{name || 'Unknown Token'}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">{symbol || '???'}</span>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-tight">{selectedChain.name}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Current Price</p>
                  <p className="text-lg font-black text-white leading-none">${priceUsd?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) || '0.00'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">24h Change</p>
                  <p className={cn("text-lg font-black leading-none", (priceChange24h || 0) >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {(priceChange24h || 0) >= 0 ? '+' : ''}{priceChange24h?.toFixed(2) || '0.00'}%
                  </p>
                </div>
              </div>

              <div className="h-40 w-full bg-black/20 rounded-3xl border border-white/5 overflow-hidden relative">
                <CandleChart 
                  coingeckoId={coingeckoId} 
                  chainId={selectedChain.chainId} 
                  contractAddress={contractAddress} 
                  days="1" 
                  currentPrice={priceUsd} 
                />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Registry Name</Label>
            <div className="p-1 rounded-2xl bg-white/[0.02] border border-white/5 shadow-xl">
                <Input placeholder="e.g. Tether USD" value={name} onChange={(e) => setName(e.target.value)} className="h-12 bg-transparent border-none px-4 text-sm font-bold text-white focus-visible:ring-0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Symbol</Label>
                <div className="p-1 rounded-2xl bg-white/[0.02] border border-white/5 shadow-xl">
                    <Input placeholder="USDT" value={symbol} onChange={(e) => setSymbol(e.target.value)} className="h-12 bg-transparent border-none px-4 text-sm font-black uppercase text-primary focus-visible:ring-0" />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Decimals</Label>
                <div className="p-1 rounded-2xl bg-white/[0.02] border border-white/5 shadow-xl">
                    <Input type="number" placeholder="18" value={decimals} onChange={(e) => setDecimals(e.target.value)} className="h-12 bg-transparent border-none px-4 text-sm font-bold text-white/60 focus-visible:ring-0 text-right" />
                </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">Visual Node</Label>
            <div className="p-4 rounded-[2rem] bg-white/[0.02] border border-white/10 backdrop-blur-xl flex items-center justify-between shadow-2xl h-24">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-inner relative">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <ImageIcon className="w-5 h-5 text-white/10" />
                        )}
                        {discoveryPhase === 'MARKET' && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-white uppercase leading-tight">Branding</p>
                        <p className="text-[8px] font-bold text-primary uppercase tracking-widest mt-0.5">
                            {discoveryPhase === 'COMPLETE' ? 'Verified' : logoUrl ? 'Active' : 'Optional'}
                        </p>
                    </div>
                </div>
                <Button variant="ghost" onClick={() => fileInputRef.current?.click()} className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 font-black uppercase text-[8px] tracking-widest text-white/60">
                    {logoUrl ? 'Change' : 'Upload'}
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button className="w-full h-20 rounded-[2.5rem] font-black text-base uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 transition-all active:scale-95 border-b-8 border-primary/50 text-white" disabled={isSaving || !contractAddress || !name || !symbol || discoveryPhase === 'ERROR'} onClick={handleSave}>
            {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : "Authorize Registry Entry"}
          </Button>
        </div>
      </main>

      <Sheet open={isChainSheetOpen} onOpenChange={setIsChainSheetOpen}>
        <SheetContent side="bottom" hideCloseButton={true} className="bg-[#0a0a0c] border-t border-primary/20 rounded-t-[3.5rem] p-0 h-[75vh] overflow-hidden flex flex-col shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black/80 -z-10" />
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-4 shrink-0" />
          <SheetHeader className="px-6 mb-6">
            <SheetTitle className="text-2xl font-black uppercase tracking-widest text-center text-white">Select Authority</SheetTitle>
            <SheetDescription className="text-center text-[10px] font-black uppercase text-primary/60 tracking-widest">Ecosystem RPC Hub</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6">
            <div className="grid grid-cols-2 gap-3 pb-32">
              {allChains.map((chain) => (
                <button key={chain.chainId} onClick={() => { setSelectedChain(chain); setIsChainSheetOpen(false); }} className={cn("flex flex-col items-center gap-3 p-6 rounded-[2.5rem] border transition-all active:scale-95 group relative overflow-hidden", selectedChain.chainId === chain.chainId ? "bg-primary/10 border-primary/40 shadow-xl" : "bg-white/[0.03] border-white/5 hover:bg-white/[0.08]")}>
                  <TokenLogoDynamic logoUrl={chain.iconUrl} alt={chain.name} size={40} chainId={chain.chainId} name={chain.name} symbol={chain.symbol} />
                  <p className="font-black text-[10px] uppercase tracking-tight text-white group-hover:text-primary transition-colors text-center">{chain.name}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
