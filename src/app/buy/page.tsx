'use client';

import { useState, useMemo, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  ChevronRight, 
  CreditCard, 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  Zap, 
  Info, 
  Loader2,
  ExternalLink,
  Lock,
  AlertCircle,
  Smartphone,
  CheckCircle2,
  Wallet,
  Copy
} from "lucide-react";
import { useWallet } from '@/contexts/wallet-provider';
import { useUser } from '@/contexts/user-provider';
import { useCurrency } from '@/contexts/currency-provider';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import type { AssetRow, ChainConfig } from '@/lib/types';
import { buyService } from '@/lib/services/buy-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

/**
 * INSTITUTIONAL BUY TERMINAL (OPEN ACCESS)
 * Version: 9.0.0 (KYC Purge Standard)
 */
function BuyPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { profile } = useUser();
    const { allAssets, allChains, prices, viewingNetwork, getAvailableAssetsForChain, balances, wallets, getAddressForChain } = useWallet();
    const { rates } = useCurrency();
    
    const [amount, setAmount] = useState('100');
    const [selectedAsset, setSelectedAsset] = useState<AssetRow | null>(null);
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');
    const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
    
    const [isNetworkSheetOpen, setIsNetworkSheetOpen] = useState(false);
    const [selectedNetworkForSelection, setSelectedNetworkForSelection] = useState<ChainConfig | null>(null);
    const [isTokenSideSheetOpen, setIsTokenSideSheetOpen] = useState(false);

    // Instruction Step State
    const [showInstructions, setShowInstructions] = useState(false);

    const hasSyncedFromParams = useRef(false);

    // 1. REGIONAL PROVIDER FILTERING
    const availableProviders = useMemo(() => {
      const list = [
        {
          id: 'MOONPAY',
          name: 'MoonPay',
          symbol: 'moon',
          type: 'card',
          desc: 'Global Card Payments',
          fee: '3.5%',
          speed: 'Instant Delivery',
          global: true
        },
        {
          id: 'MOBILE_MONEY',
          name: 'Mobile Money',
          symbol: 'mobile',
          type: 'bank',
          desc: 'Regional Bank Transfer',
          fee: '1.0%',
          speed: '~15m Verification',
          countryRestriction: 'NG'
        }
      ];

      return list.filter(p => {
        if (p.global) return true;
        if (p.countryRestriction && profile?.country_code === p.countryRestriction) return true;
        return false;
      });
    }, [profile?.country_code]);

    const hasBankOption = useMemo(() => 
      availableProviders.some(p => p.type === 'bank'), 
    [availableProviders]);

    useEffect(() => {
        if (paymentMethod === 'bank' && !hasBankOption) {
          setPaymentMethod('card');
        }
        
        const active = availableProviders.find(p => p.type === paymentMethod);
        setSelectedQuote(active || availableProviders[0]);
    }, [paymentMethod, availableProviders, hasBankOption]);

    useEffect(() => {
        if (!hasSyncedFromParams.current && allAssets.length > 0) {
            const symbolParam = searchParams.get('symbol');
            const chainIdParam = parseInt(searchParams.get('chainId') || '');

            if (symbolParam) {
                const target = allAssets.find(a => 
                    a.symbol === symbolParam && 
                    (isNaN(chainIdParam) || a.chainId === chainIdParam)
                );
                
                if (target) {
                    setSelectedAsset(target);
                    hasSyncedFromParams.current = true;
                    return;
                }
            }

            const initial = allAssets.find(a => a.chainId === (viewingNetwork?.chainId || 1)) || allAssets[0];
            setSelectedAsset(initial);
            hasSyncedFromParams.current = true;
        }
    }, [allAssets, searchParams, viewingNetwork]);

    const currentPrice = useMemo(() => {
        if (!selectedAsset) return 0;
        const priceId = (selectedAsset.priceId || selectedAsset.coingeckoId || selectedAsset.address)?.toLowerCase();
        return prices[priceId]?.price || 0;
    }, [selectedAsset, prices]);

    const cryptoAmount = (parseFloat(amount) || 0) / (currentPrice || 1);

    /**
     * DISPATCH HANDSHAKE
     */
    const handleBuy = async () => {
        if (!selectedQuote || !selectedAsset || !wallets || !profile) {
            toast({ variant: "destructive", title: "Setup Required", description: "Select a provider and ensure wallet nodes are active." });
            return;
        }

        const chain = allChains.find(c => c.chainId === selectedAsset.chainId) || viewingNetwork;
        const address = getAddressForChain(chain, wallets);

        if (!address) {
            toast({ variant: "destructive", title: "Node Error", description: `Could not resolve a vault address for ${chain.name}.` });
            return;
        }

        setIsProcessingOrder(true);

        try {
            // Register internal intent
            await buyService.initiateOrder({
                userId: profile.id,
                token: selectedAsset.symbol,
                network: chain.name,
                fiatAmount: parseFloat(amount),
                fiatCurrency: 'USD',
                walletAddress: address,
                provider: selectedQuote.id
            });

            if (selectedQuote.id === 'MOONPAY') {
                window.open(`https://buy.moonpay.com?apiKey=pk_live_placeholder&currencyCode=${selectedAsset.symbol.toLowerCase()}&walletAddress=${address}`, '_blank');
                toast({ title: "Terminal Handover", description: `Routing to ${selectedQuote.name} for settlement.` });
            } else {
                // TRIGGER INSTRUCTION NODE FOR MOBILE MONEY
                setShowInstructions(true);
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Session Error", description: "Failed to connect with payment provider." });
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const handleTokenSelect = (token: AssetRow) => {
        setSelectedAsset(token);
        setIsTokenSideSheetOpen(false);
        setIsNetworkSheetOpen(false);
    };

    const chain = allChains.find(c => c.chainId === selectedAsset?.chainId) || viewingNetwork;
    const recipientAddress = wallets ? getAddressForChain(chain, wallets) : 'Resolving node...';
    const nairaAmount = (parseFloat(amount) || 0) * (rates['NGN'] || 1650);

    return (
        <div className="flex flex-col h-screen bg-transparent text-foreground">
            <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex flex-col items-center text-center">
                    <h1 className="text-xs font-black uppercase tracking-[0.2em] leading-none text-white">Fiat Gateway</h1>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <ShieldCheck className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[8px] text-primary font-black uppercase tracking-tighter">Institutional Liquidity</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-xl"><Info className="w-5 h-5 text-muted-foreground" /></Button>
            </header>

            <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full overflow-y-auto thin-scrollbar pb-32">
                
                {/* RECIPIENT NODE ADDRESS */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Payout Destination</p>
                        <span className="text-[8px] font-black text-green-500 uppercase bg-green-500/10 px-2 py-0.5 rounded-full">Secure Node</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4 shadow-xl">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-tight">Your Hardware Vault</p>
                            <p className="text-[11px] font-mono text-white truncate font-bold">{recipientAddress}</p>
                        </div>
                    </div>
                </section>

                {/* AMOUNT INPUT */}
                <section className="space-y-4">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Purchase Amount</p>
                    <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 space-y-4 text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16" />
                        <div className="flex items-baseline justify-center gap-2 relative z-10">
                            <span className="text-2xl font-bold text-muted-foreground/50">$</span>
                            <Input 
                                type="number" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)}
                                className="text-5xl font-black bg-transparent border-none p-0 h-auto text-center focus-visible:ring-0 tracking-tighter w-full max-w-[200px] text-white"
                            />
                            <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">USD</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 w-fit mx-auto relative z-10">
                            <Zap className="w-3 h-3 text-primary" />
                            <span className="text-[10px] font-bold text-primary">You will receive ≈ {cryptoAmount.toFixed(6)} {selectedAsset?.symbol}</span>
                        </div>
                    </div>
                </section>

                {/* ASSET SELECTOR */}
                <section className="space-y-4">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Asset to Receive</p>
                    <button 
                        onClick={() => setIsNetworkSheetOpen(true)}
                        className="w-full flex items-center justify-between p-5 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group shadow-2xl"
                    >
                        <div className="flex items-center gap-4">
                            <TokenLogoDynamic 
                                logoUrl={selectedAsset?.iconUrl} 
                                alt={selectedAsset?.symbol || ''} 
                                size={40} 
                                chainId={selectedAsset?.chainId} 
                                symbol={selectedAsset?.symbol} 
                                name={selectedAsset?.name} 
                            />
                            <div className="text-left">
                                <p className="font-bold text-base text-white">{selectedAsset?.symbol || 'Select Asset'}</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{selectedAsset?.name}</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </button>
                </section>

                {/* PAYMENT METHOD SELECTION */}
                {hasBankOption && (
                  <section className="space-y-4">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Payment Method</p>
                      <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                          <button 
                              onClick={() => setPaymentMethod('card')}
                              className={cn(
                                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                  paymentMethod === 'card' ? "bg-primary text-black shadow-lg" : "text-white/40"
                              )}
                          >
                              Credit/Debit Card
                          </button>
                          <button 
                              onClick={() => setPaymentMethod('bank')}
                              className={cn(
                                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                  paymentMethod === 'bank' ? "bg-primary text-black shadow-lg" : "text-white/40"
                              )}
                          >
                              Bank Transfer
                          </button>
                      </div>
                  </section>
                )}

                {/* PROVIDER ROUTE */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Select Route</p>
                        <span className="text-[8px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full">Optimal Path Active</span>
                    </div>
                    
                    <div className="space-y-3">
                        {availableProviders.filter(p => p.type === paymentMethod).map((p) => (
                            <button 
                                key={p.id}
                                onClick={() => setSelectedQuote(p)}
                                className={cn(
                                    "w-full flex items-center justify-between p-5 rounded-[2.5rem] border transition-all shadow-xl group",
                                    selectedQuote?.id === p.id ? "bg-primary/10 border-primary/50" : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06]"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-[1.25rem] bg-black border border-white/10 flex items-center justify-center overflow-hidden">
                                        <TokenLogoDynamic 
                                          logoUrl={null} 
                                          symbol={p.symbol} 
                                          name={p.name} 
                                          size={32} 
                                          className="object-contain"
                                        />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black text-sm text-white uppercase tracking-tight">{p.name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{p.desc}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">{p.fee} Fee</p>
                                    <div className="flex items-center gap-1.5 justify-end">
                                        <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                        <p className="text-[8px] text-white/40 font-bold uppercase">{p.speed}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                <div className="p-5 rounded-[2rem] bg-primary/5 border border-primary/10 flex items-start gap-4">
                    <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed uppercase font-black tracking-tight">
                        Assets will be delivered to <span className="text-white">{recipientAddress.slice(0, 10)}...</span> immediately following successful payment verification. This is a non-custodial handshake.
                    </p>
                </div>
            </main>

            <div className="fixed bottom-8 left-0 right-0 px-6 z-40">
                <Button 
                    className="w-full h-16 rounded-full font-black text-lg shadow-2xl bg-primary hover:bg-primary/90 border-b-4 border-primary/50 shadow-primary/30 text-black flex items-center justify-center gap-3 transition-all active:scale-95"
                    onClick={handleBuy}
                    disabled={isProcessingOrder || !selectedQuote}
                >
                    {isProcessingOrder ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Authorize Buy Handshake <ExternalLink className="w-5 h-5" /></>}
                </Button>
            </div>

            {/* PAYMENT INSTRUCTIONS DIALOG */}
            <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 rounded-[3rem] p-8 max-w-[95vw] sm:max-w-[400px] overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-flow" />
                    
                    <DialogHeader className="space-y-4 items-center text-center">
                        <div className="w-16 h-16 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Bank Transfer</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground uppercase tracking-widest font-black opacity-60">
                            Transfer Node Allocation
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-8 space-y-6">
                        <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/5 space-y-4 shadow-inner">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Bank Name</p>
                                <p className="text-sm font-bold text-white uppercase">WNC SETTLEMENT BANK</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Account Number</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-2xl font-black text-primary font-mono tracking-widest">8354921008</p>
                                    <button onClick={() => { navigator.clipboard.writeText("8354921008"); toast({title: "Account Copied"}); }} className="p-2 rounded-xl bg-white/5 text-primary"><Copy className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Amount to Pay</p>
                                <p className="text-lg font-black text-white">₦ {nairaAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Reference Code</p>
                                <p className="text-[10px] font-mono font-bold text-white/60 uppercase">REF: {profile?.account_number || 'NODE-832'}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-black">
                                Transfer the exact amount above. Your crypto node will be credited automatically upon confirmation.
                            </p>
                        </div>

                        <Button 
                            className="w-full h-16 rounded-[2rem] font-black text-sm uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
                            onClick={() => {
                                setShowInstructions(false);
                                toast({ title: "Payment Notified", description: "Registry sentinel is awaiting confirmation." });
                                router.push('/');
                            }}
                        >
                            I Have Paid
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* NETWORK SELECTION SHEET */}
            <Sheet open={isNetworkSheetOpen} onOpenChange={setIsNetworkSheetOpen}>
                <SheetContent side="bottom" className="bg-[#0a0a0c] border-t border-primary/20 rounded-t-[3.5rem] p-0 h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                    <div className="absolute inset-0 bg-[#0a0a0c]/80 backdrop-blur-3xl -z-10" />
                    <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-4 shrink-0" />
                    <SheetHeader className="mb-6 px-6 pt-4 shrink-0">
                        <SheetTitle className="sr-only">Select Network</SheetTitle>
                        <div className="text-2xl font-black text-center uppercase tracking-widest text-white">Target Ecosystem</div>
                    </SheetHeader>
                    <ScrollArea className="flex-1 px-6">
                        <div className="grid grid-cols-2 gap-3 pb-32">
                            {allChains.map((chain) => (
                                <button 
                                    key={chain.chainId} 
                                    onClick={() => { setSelectedNetworkForSelection(chain); setIsTokenSideSheetOpen(true); }} 
                                    style={{ borderColor: `${chain.themeColor || '#818cf8'}40`, background: `linear-gradient(135deg, ${chain.themeColor || '#818cf8'}15 0%, rgba(0,0,0,0) 100%)` }} 
                                    className="flex flex-col items-center gap-3 p-6 rounded-[2rem] border transition-all text-center group active:scale-95 shadow-xl"
                                >
                                    <TokenLogoDynamic logoUrl={chain.iconUrl} alt={chain.name} size={40} chainId={chain.chainId} name={chain.name} symbol={chain.symbol} />
                                    <p className="font-black text-[10px] uppercase tracking-widest text-white group-hover:text-primary transition-colors">{chain.name}</p>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            {/* TOKEN SELECTION SHEET */}
            <Sheet open={isTokenSideSheetOpen} onOpenChange={setIsTokenSideSheetOpen}>
                <SheetContent side="right" className="bg-[#0a0a0c]/95 backdrop-blur-2xl border-l border-white/5 w-full sm:max-w-[450px] p-0 flex flex-col h-full overflow-hidden shadow-2xl">
                    <SheetHeader className="p-6 border-b border-white/5 shrink-0">
                        <SheetTitle className="sr-only">Select Token</SheetTitle>
                        <Button variant="ghost" size="icon" onClick={() => setIsTokenSideSheetOpen(false)} className="mb-4 rounded-xl"><ArrowLeft className="w-5 h-5"/></Button>
                        <div className="text-xl font-black uppercase tracking-tight text-white">{selectedNetworkForSelection?.name} Assets</div>
                    </SheetHeader>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-2 pb-32">
                            {selectedNetworkForSelection && getAvailableAssetsForChain(selectedNetworkForSelection.chainId).map((token) => { 
                                const asset = (balances[selectedNetworkForSelection.chainId]?.find(b => b.symbol === token.symbol) || { ...token, balance: '0' }) as AssetRow; 
                                return (
                                    <button 
                                        key={asset.symbol} 
                                        onClick={() => handleTokenSelect(asset)} 
                                        className="w-full flex items-center justify-between p-5 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/10 transition-all text-left group active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <TokenLogoDynamic logoUrl={asset.iconUrl} alt={asset.symbol} size={44} chainId={asset.chainId} symbol={asset.symbol} name={asset.name} />
                                            <div>
                                                <p className="font-black text-base text-white">{asset.symbol}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-40">{asset.name}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
    );
}

export default function BuyPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full flex-col items-center justify-center bg-[#050505] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Syncing Buy Terminal...</p>
            </div>
        }>
            <BuyPageContent />
        </Suspense>
    );
}
