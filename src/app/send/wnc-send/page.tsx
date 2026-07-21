'use client';

import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/wallet-provider';
import { useCurrency } from '@/contexts/currency-provider';
import { useUser } from '@/contexts/user-provider';
import { gasService } from '@/services/gasService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Loader2, 
  ShieldCheck,
  Zap,
  QrCode,
  X,
  ImageIcon,
  ChevronDown,
  Coins,
  Activity,
  AlertCircle,
  ArrowRight,
  Search,
  Fuel,
  ShieldAlert,
  Crown,
  ShieldOff,
  Lock,
  Users
} from 'lucide-react';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import { useToast } from '@/hooks/use-toast';
import type { AssetRow } from '@/lib/types';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TransactionConfirmationSheet from '@/components/wallet/transaction-confirmation-sheet';
import TransactionStatusCard from '@/components/wallet/transaction-status-card';
import TransactionReceiptSheet from '@/components/wallet/transaction-receipt-sheet';
import GlobalTokenSelector from '@/components/shared/global-token-selector';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { liquiditySendService } from '@/lib/services/liquidity-send-service';
import { WNC_TRANSACTION_FEE } from '@/lib/services/swap-fee-calculator';

// SHARED LOGIC IMPORT
import { 
  detectAddressType, 
  getDetectedNetworkMeta,
  mapTechnicalError 
} from '@/components/wallet/send/WalletComponents';

/**
 * INSTITUTIONAL SPONSORED WNC DISPATCH
 * Version: 10.2.0 (Unblocked Protocol Standard)
 */
function WncSendContent() {
  const { viewingNetwork, wallets, infuraApiKey, allAssets, prices, allChainsMap, refresh, setActiveFulfillmentId } = useWallet();
  const { formatFiat, rates } = useCurrency();
  const { profile, isPremium, refreshProfile } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isStatusVisible, setIsStatusVisible] = useState(false);
  const [txStatus, setTxStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptError, setReceiptError] = useState('');

  const [selectedToken, setSelectedToken] = useState<AssetRow | null>(null);
  const [recipientInput, setRecipientInput] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [recipientProfile, setRecipientProfile] = useState<any>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const debouncedRecipient = useDebounce(recipientInput, 300);

  const [amount, setAmount] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionPhase, setExecutionPhase] = useState<string>('IDLE');
  const [txHash, setTxHash] = useState('');

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const hasInitialized = useRef(false);
  const resolutionCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // COMPLIANCE SENTINELS
  const isAccountProtected = profile?.is_disabled || profile?.security_locked;

  // 1. GAS HANDSHAKE
  const [, setGasUpdate] = useState(0);
  useEffect(() => {
    if (allChainsMap) {
      gasService.startGasUpdater(Object.values(allChainsMap), infuraApiKey);
    }
    return gasService.subscribe(() => {
      setGasUpdate(prev => prev + 1);
    });
  }, [allChainsMap, infuraApiKey]);

  const activeNetwork = useMemo(() => {
    const chainId = selectedToken?.chainId ?? 1;
    return allChainsMap[chainId] || viewingNetwork;
  }, [selectedToken, viewingNetwork, allChainsMap]);

  // 2. SCANNER LIFECYCLE
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    if (isScannerOpen) {
      const timer = setTimeout(async () => {
        try {
          html5QrCode = new Html5Qrcode("reader-sponsored");
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              setRecipientInput(decodedText);
              setIsScannerOpen(false);
              if (html5QrCode?.isScanning) html5QrCode.stop();
            },
            () => {}
          );
        } catch (err) {}
      }, 300);
      return () => {
        clearTimeout(timer);
        if (html5QrCode?.isScanning) html5QrCode.stop();
      };
    }
  }, [isScannerOpen]);

  // 3. INITIAL ASSET SYNC
  useEffect(() => {
    if (allAssets.length === 0 || hasInitialized.current) return;
    const symbol = searchParams.get('symbol');
    const chainIdParam = parseInt(searchParams.get('chainId') || '');
    let target = allAssets.find(a => a.symbol === symbol && (a.chainId === chainIdParam || a.symbol === 'WNC'));
    if (!target || target.symbol === 'WNC') {
        target = allAssets.find(a => a.symbol === 'USDT' || a.symbol === 'USDC') || allAssets.find(a => a.isNative) || allAssets[0];
    }
    if (target) { setSelectedToken({ ...target }); hasInitialized.current = true; }
  }, [allAssets, searchParams]);

  const livePrice = useMemo(() => {
    if (!selectedToken || !prices) return 0;
    const priceId = (selectedToken.priceId || selectedToken.coingeckoId || selectedToken.address || '').toLowerCase();
    return prices[priceId]?.price || selectedToken.priceUsd || 0;
  }, [selectedToken, prices]);

  // 4. WNC CALCULATION ENGINE
  const calculations = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0 || !selectedToken) return null;

    const amt = parseFloat(amount);
    const tokenPriceUsd = livePrice;
    const wncPriceUsd = prices['internal:wnc']?.price || 0.0006;
    
    const targetChainName = allChainsMap[selectedToken.chainId]?.name || 'Ethereum';
    const gasData = gasService.getGasPrice(targetChainName);
    const gasUsd = gasData?.usdFee || 0.15;
    
    // INSTITUTIONAL BURN NODE: Fixed 50 WNC Fee
    const adminFeeWnc = WNC_TRANSACTION_FEE; 
    const gasFeeWnc = Math.ceil(gasUsd / (wncPriceUsd || 0.0006));
    const wncValueCost = (amt * tokenPriceUsd) / (wncPriceUsd || 0.0006);
    
    const totalWncCost = Math.ceil(wncValueCost + gasFeeWnc + adminFeeWnc);

    return {
      tokenPriceUsd,
      wncPriceUsd,
      gasUsd,
      gasFeeWnc,
      adminFeeWnc,
      totalWncCost,
      totalValueUsd: amt * tokenPriceUsd,
      cryptoPayout: amt
    };
  }, [amount, selectedToken, prices, allChainsMap, livePrice]);

  const addrType = useMemo(() => detectAddressType(debouncedRecipient), [debouncedRecipient]);
  const detectedMeta = useMemo(() => getDetectedNetworkMeta(addrType), [addrType]);

  const isSelfTransfer = useMemo(() => {
    if (!debouncedRecipient) return false;
    const input = debouncedRecipient.trim().toLowerCase();
    if (profile?.account_number && input === profile.account_number.toLowerCase()) return true;
    if (wallets) return wallets.some(w => w.address.toLowerCase() === input);
    return false;
  }, [debouncedRecipient, profile, wallets]);

  const validationError = useMemo(() => {
    if (isSelfTransfer) return { title: "Self-Reflect", message: "Dispatches to your own node are blocked." };
    if (debouncedRecipient.length > 0 && addrType === 'invalid') return { title: "Format Error", message: "Invalid recipient node identified." };
    return null;
  }, [addrType, isSelfTransfer, debouncedRecipient]);

  const isNetworkMismatch = useMemo(() => {
    if (isSelfTransfer || !debouncedRecipient) return false;
    if (addrType === 'invalid' || addrType.includes('invalid-')) return false;
    if (addrType === 'account-id') return false;
    const activeType = activeNetwork.type || 'evm';
    if (activeType === 'aptos' || activeType === 'sui') return addrType !== 'move-chain';
    const cosmosVariants = ['cosmos', 'osmosis', 'secret', 'injective', 'celestia'];
    if (cosmosVariants.includes(activeType)) return !cosmosVariants.includes(addrType);
    return activeType !== addrType;
  }, [addrType, activeNetwork.type, isSelfTransfer, debouncedRecipient]);

  // INSTITUTIONAL PREMIUM GUARD
  const MAX_FREE_LIMIT = 100;
  const isOverLimit = !isPremium && (calculations?.totalValueUsd || 0) > MAX_FREE_LIMIT;

  // 5. ADDRESS RESOLUTION
  useEffect(() => {
    const currentId = ++resolutionCounter.current;
    async function resolve() {
      const input = debouncedRecipient.trim();
      if (!input || input.length < 3 || isSelfTransfer || validationError || isNetworkMismatch) {
        if (currentId === resolutionCounter.current) { setResolvedAddress(''); setRecipientProfile(null); setIsResolving(false); setResolutionError(null); }
        return;
      }

      if (addrType === 'account-id') {
        setIsResolving(true);
        try {
          const { data } = await supabase.from('profiles').select('*').eq('account_number', input).maybeSingle();
          if (currentId !== resolutionCounter.current) return;
          if (data) {
            setRecipientProfile(data);
            const chainKey = `${(activeNetwork.type || 'evm')}_address`;
            setResolvedAddress(data[chainKey] || '');
            if (!data[chainKey]) setResolutionError(`Identity found, but no ${selectedToken?.symbol} node registered.`);
          } else { setResolutionError("Identity Node not found."); }
        } catch (e) { setResolutionError("Resolution failed."); }
        finally { if (currentId === resolutionCounter.current) setIsResolving(false); }
      } else {
        setResolvedAddress(input);
        setRecipientProfile(null);
      }
    }
    resolve();
  }, [debouncedRecipient, addrType, selectedToken, isSelfTransfer, validationError, activeNetwork, isNetworkMismatch]);

  const handleAuthorize = async () => {
    if (!profile || !selectedToken || !calculations || !resolvedAddress) return;

    setIsConfirmOpen(false);
    setIsStatusVisible(true);
    setTxStatus('pending');
    setIsExecuting(true);

    try {
      const hash = await liquiditySendService.executeGaslessSend({
        userId: profile.id,
        profile,
        targetToken: selectedToken,
        targetChain: activeNetwork,
        amount: parseFloat(amount) * livePrice,
        wncPriceUsd: calculations.wncPriceUsd,
        recipientAddress: resolvedAddress,
        setPhase: setExecutionPhase
      });

      setTxHash(hash);
      setTxStatus('success');
    } catch (e: any) {
      setTxStatus('error');
      setReceiptError(mapTechnicalError(e));
    } finally {
      setIsExecuting(false);
      setTimeout(() => { setIsStatusVisible(false); setIsReceiptOpen(true); }, 3000);
    }
  };

  const handleCloseReceipt = async (open: boolean) => {
    setIsReceiptOpen(open);
    if (!open && txStatus === 'success') {
      toast({ title: "Synchronizing Registry..." });
      await Promise.all([refreshProfile(), refresh()]);
      router.push('/');
    }
  };

  const tokenBalance = parseFloat(selectedToken?.balance || '0');
  const amountNum = parseFloat(amount) || 0;
  
  // 🛡️ UNBLOCKED PROTOCOL: Check strictly if amount > tokenBalance, ignore WNC fee for UI blocking
  const hasInsufficientFunds = amountNum > (tokenBalance + 0.0000000001);

  // 🛡️ UNBLOCKED ACTION GATE: Gating is only for core protocol violations, not for missing fees.
  const canSend = resolvedAddress.length > 0 && !validationError && !isNetworkMismatch && amountNum > 0 && !isExecuting && !isOverLimit && !isAccountProtected;

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-foreground relative">
      <header className="p-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-black/50 backdrop-blur-2xl z-50 px-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
        <button onClick={() => setIsSelectorOpen(true)} className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full hover:bg-primary/20 transition-all">
            <TokenLogoDynamic logoUrl={selectedToken?.iconUrl} size={20} chainId={selectedToken?.chainId} symbol={selectedToken?.symbol} name={selectedToken?.name} />
            <div className="flex items-start leading-none"><span className="text-[10px] font-black uppercase text-white">{selectedToken?.symbol}</span><span className="text-[7px] font-bold text-primary uppercase opacity-60 ml-1">{activeNetwork.name}</span></div>
            <ChevronDown className="w-3 h-3 text-primary" />
        </button>
        <Button variant="ghost" size="icon" onClick={() => setIsScannerOpen(true)} className="rounded-xl"><QrCode className="w-5 h-5 text-primary" /></Button>
      </header>

      <main className="flex-1 p-6 space-y-10 max-w-lg mx-auto w-full pb-48 overflow-y-auto thin-scrollbar">
          
          <AnimatePresence>
            {isAccountProtected && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex gap-4 shadow-2xl">
                <ShieldOff className="w-6 h-6 text-red-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-black text-red-500 uppercase tracking-widest">Account Protected</p>
                  <p className="text-[11px] text-red-400/80 leading-relaxed font-medium">
                    Sponsored dispatches are disabled. Re-enable in <button onClick={() => router.push('/profile/security')} className="text-white underline font-bold">Settings</button>.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <section className="flex items-center justify-between pt-2">
              <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                      <Avatar className="w-20 h-20 rounded-[2.5rem] border-2 border-primary/30 shadow-2xl bg-black relative z-10"><AvatarImage src={profile?.photo_url} /><AvatarFallback className="bg-primary/20 text-primary font-black text-xl">{profile?.name?.[0] || 'N'}</AvatarFallback></Avatar>
                      <div className="absolute -bottom-2 -right-2 bg-black rounded-xl p-1 border border-white/10 shadow-xl z-20"><TokenLogoDynamic logoUrl="/icons/iconwnc.png" size={24} chainId={0} symbol="WNC" name="Wevinacoin" alt="wnc badge" /></div>
                  </div>
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">FROM NODE</span>
              </div>
              <div className="flex-1 px-4 relative flex flex-col items-center justify-center min-h-[100px]">
                  <div className="w-full h-[1px] bg-gradient-to-r from-primary/20 via-primary to-primary/20 relative"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#050505] p-2 border border-white/5 rounded-full z-10"><ArrowRight className="w-4 h-4 text-primary animate-pulse" /></div></div>
                  <AnimatePresence>{resolvedAddress && !isResolving && (
                      <motion.div initial={{ y: 20, opacity: 0, scale: 0.9 }} animate={{ y: 30, opacity: 1, scale: 1 }} exit={{ y: 15, opacity: 0 }} className="absolute left-0 right-0 text-center z-20"><div className="inline-flex flex-col items-center gap-1.5"><p className={cn("text-[7px] font-black uppercase tracking-[0.25em]", (isNetworkMismatch || validationError) ? "text-red-500" : "text-primary")}>{isNetworkMismatch ? 'Incompatible Route' : validationError ? 'Format Alert' : 'Resolved Identity'}</p><div className={cn("bg-black/80 border px-3 py-2 rounded-2xl backdrop-blur-md shadow-2xl", (isNetworkMismatch || validationError) ? "border-red-500/30" : "border-primary/20")}><p className="text-[10px] font-mono text-white tracking-tighter whitespace-nowrap">{resolvedAddress.length > 15 ? `${resolvedAddress.slice(0, 10)}...${resolvedAddress.slice(-8)}` : resolvedAddress}</p></div></div></motion.div>
                  )}</AnimatePresence>
              </div>
              <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                      <div className={cn("w-20 h-20 rounded-[2.5rem] border-2 flex items-center justify-center transition-all duration-500 bg-black relative overflow-hidden z-10", (!resolvedAddress && !isNetworkMismatch && !validationError && !isSelfTransfer) ? "border-dashed border-white/10" : (isNetworkMismatch || (resolvedAddress && validationError) || isSelfTransfer) ? "border-red-500 bg-red-500/10 border-dashed" : "border-primary/50 shadow-[0_0_30px_rgba(139,92,246,0.15)]")}>{isResolving ? <Loader2 className="w-8 h-8 animate-spin text-primary opacity-40" /> : isSelfTransfer ? <Avatar className="w-full h-full rounded-none"><AvatarImage src={profile?.photo_url} /><AvatarFallback>{profile?.name?.[0]}</AvatarFallback></Avatar> : recipientProfile ? <Avatar className="w-full h-full rounded-none"><AvatarImage src={recipientProfile.photo_url} /><AvatarFallback>{(recipientProfile.name?.[0] || 'N').toUpperCase()}</AvatarFallback></Avatar> : (isNetworkMismatch || validationError) ? <TokenLogoDynamic logoUrl={null} alt="Err" size={40} symbol={detectedMeta?.symbol} name={detectedMeta?.name} /> : resolvedAddress ? <TokenLogoDynamic logoUrl={selectedToken?.iconUrl} alt="Token" size={40} chainId={selectedToken?.chainId} symbol={selectedToken?.symbol} name={selectedToken?.name} /> : <Search className="w-8 h-8 text-white/10" />}</div>
                      {resolvedAddress && !isResolving && <div className="absolute -bottom-2 -right-2 bg-black rounded-xl p-1 border border-white/10 shadow-xl z-20"><TokenLogoDynamic logoUrl={selectedToken?.iconUrl} size={24} chainId={selectedToken?.chainId} symbol={selectedToken?.symbol} name={selectedToken?.name} alt="token badge" /></div>}
                  </div>
                  <span className={cn("text-[8px] font-black uppercase tracking-widest truncate w-20 text-center", (isNetworkMismatch || validationError || isSelfTransfer) ? "text-red-500" : "text-white/40")}>{isSelfTransfer ? 'SELF-REFLECT' : recipientProfile ? `TO @${(recipientProfile.name || 'Unknown').toUpperCase()}` : isNetworkMismatch ? `${detectedMeta?.name || 'UNKNOWN'} DETECTED` : (validationError || (debouncedRecipient && addrType === 'invalid')) ? 'NODE INVALID' : resolvedAddress ? 'TARGET NODE' : 'TO IDENTITY'}</span>
              </div>
          </section>

          <section className="space-y-3">
              <div className="flex justify-between items-center px-2"><Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Recipient Node ID</Label><button onClick={async () => setRecipientInput(await navigator.clipboard.readText())} className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-lg">PASTE</button></div>
              <div className={cn("bg-white/[0.03] border border-white/10 rounded-[2rem] p-2", (validationError || resolutionError || isNetworkMismatch) && "border-red-500/50 bg-red-500/5")}>
                <div className="flex items-center gap-2 px-2">
                  <Input placeholder="Paste address or Node ID" value={recipientInput} onChange={(e) => setRecipientInput(e.target.value)} className="h-12 bg-transparent border-none text-sm font-mono focus-visible:ring-0 text-white flex-1" />
                  {isResolving && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                </div>
              </div>
              {(resolutionError || validationError || isNetworkMismatch) && !isResolving && (
                <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-[10px] font-black text-red-500/80 uppercase leading-relaxed">
                    {isNetworkMismatch ? `Cross-Network Error: ${detectedMeta?.name} address detected.` : resolutionError || (validationError as any)?.message}
                  </p>
                </div>
              )}
          </section>

          <section className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <Label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Authorization Amount</Label>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[9px] font-bold uppercase", hasInsufficientFunds ? "text-red-400 animate-pulse" : "text-white/40")}>Bal: {tokenBalance.toFixed(2)} {selectedToken?.symbol}</span>
                  <button className="h-6 px-2 text-[9px] font-black text-primary uppercase bg-primary/10 rounded-md transition-all active:scale-90" onClick={() => setAmount(tokenBalance.toString())}>MAX</button>
                </div>
              </div>
              <div className={cn("bg-white/[0.03] border rounded-[2.5rem] p-5 transition-all", (hasInsufficientFunds || isOverLimit) ? "border-red-500/30 ring-4 ring-red-500/5" : "border-white/10")}>
                <div className="flex items-baseline justify-between gap-4">
                  <div className="overflow-x-auto thin-scrollbar scroll-smooth flex-1">
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      className={cn("bg-transparent border-none text-[clamp(1.5rem,8vw,2.5rem)] font-black p-0 h-auto focus-visible:ring-0 tracking-tighter w-full min-w-[200px]", (hasInsufficientFunds || isOverLimit) ? "text-red-400" : "text-white")} 
                    />
                  </div>
                  <div className="shrink-0 flex flex-col items-end">
                    <span className="text-sm font-black text-primary uppercase">{selectedToken?.symbol}</span>
                    <span className="text-[8px] font-bold text-white/20 uppercase">{activeNetwork.name}</span>
                  </div>
                </div>
                <div className="mt-2 text-[10px] font-bold text-muted-foreground/40 uppercase italic">
                  ≈ {formatFiat((parseFloat(amount) || 0) * livePrice)}
                </div>
              </div>

              <AnimatePresence>
                {isOverLimit && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3 shadow-xl">
                    <Crown className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Premium Required</p>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-medium mt-1">
                        Free users are limited to <span className="text-white font-bold">$100.00</span> for sponsored dispatches. 
                        <button onClick={() => router.push('/buy')} className="text-amber-500 font-bold underline ml-1">Upgrade to Premium</button> for full vault access.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
          </section>

          <section className="space-y-1">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <Fuel className="w-4 h-4 text-primary/40" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Network Gas (Sponsorship)</span>
                  </div>
                  <span className="text-xs font-black text-white uppercase">{calculations?.gasUsd ? `$${(calculations.gasUsd).toFixed(2)}` : 'Sponsoring...'}</span>
              </div>

              <div className="p-6 rounded-[2.5rem] bg-primary/5 border border-primary/20 space-y-4 shadow-2xl relative overflow-hidden">
                  <div className="flex justify-between items-start relative z-10">
                      <div>
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Total WNC Burn (Amount + {WNC_TRANSACTION_FEE} Fee)</p>
                          <p className="text-4xl font-black tabular-nums leading-none tracking-tighter text-white">
                              {calculations?.totalWncCost.toLocaleString() || '0'}
                          </p>
                      </div>
                      <div className="opacity-40">
                        <TokenLogoDynamic logoUrl="/icons/iconwnc.png" size={24} chainId={0} symbol="WNC" name="Wevinacoin" />
                      </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-primary/10">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/5">
                          <Activity className={cn("w-3 h-3", isExecuting ? "text-primary animate-pulse" : "text-white/20")} />
                          <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Status: {isExecuting ? executionPhase : 'Standby'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-40">
                        <ShieldCheck className="w-3 h-3 text-primary" />
                        <span className="text-[8px] font-black uppercase text-white tracking-widest">Revenue Node: Admin</span>
                      </div>
                  </div>
                  
                  <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
              </div>
          </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/95 to-transparent backdrop-blur-md z-40">
          <Button 
            className={cn(
                "w-full h-16 rounded-[2rem] text-lg font-black shadow-2xl transition-all border-b-4 uppercase tracking-widest", 
                canSend ? "bg-primary hover:bg-primary/90 border-primary/50 text-white" : "bg-zinc-900 border-zinc-950 opacity-50 grayscale cursor-not-allowed"
            )} 
            disabled={!canSend} 
            onClick={() => setIsConfirmOpen(true)}
          >
              {isExecuting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Authorize Burn & Dispatch"}
          </Button>
      </div>

      <AnimatePresence>{isScannerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6"><div className="w-full max-sm mx-auto space-y-8"><div className="flex items-center justify-between"><div className="space-y-1"><h3 className="text-xl font-black text-white uppercase tracking-tight">Handshake Scanner</h3><p className="text-[10px] font-black text-primary uppercase tracking-widest">Sponsored Node Verification</p></div><Button variant="ghost" size="icon" onClick={() => setIsScannerOpen(false)} className="rounded-full bg-white/5"><X className="w-5 h-5 text-white" /></Button></div><div className="relative aspect-square w-full rounded-[3rem] overflow-hidden border-4 border-primary/20 shadow-2xl bg-zinc-900"><div id="reader-sponsored" className="w-full h-full" /><motion.div animate={{ y: [0, 250, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-1 bg-primary/60 blur-md z-10" /></div><div className="space-y-4 px-4 text-center text-xs text-white/40 leading-relaxed font-medium">Position the target QR code within the frame to authorize the sponsored handshake.</div></div></motion.div>
      )}</AnimatePresence>

      <GlobalTokenSelector isOpen={isSelectorOpen} onOpenChange={setIsSelectorOpen} onSelect={(token) => { setSelectedToken({ ...token }); }} title="Select Dispatch Node" />
      
      <TransactionConfirmationSheet 
        isOpen={isConfirmOpen} 
        onOpenChange={setIsConfirmOpen} 
        onConfirm={handleAuthorize} 
        isSubmitting={isExecuting} 
        amountToken={amount}
        amountUsd={(parseFloat(amount) || 0) * livePrice} 
        token={selectedToken} 
        recipientName={recipientProfile?.name || 'Target Node'} 
        recipientAddress={resolvedAddress} 
        recipientAvatar={recipientProfile?.photo_url} 
        totalFeeUsd={0} 
        totalWncToDeduct={calculations?.totalWncCost}
      />
      
      <TransactionStatusCard 
        isVisible={isStatusVisible} 
        status={txStatus} 
        senderName="You" 
        senderAvatar={profile?.photo_url} 
        recipientName={recipientProfile?.name || 'Target Node'} 
        recipientAvatar={recipientProfile?.photo_url} 
        token={{ symbol: selectedToken?.symbol || '', iconUrl: selectedToken?.iconUrl, chainId: selectedToken?.chainId || 1, name: selectedToken?.name }} 
      />
      
      <TransactionReceiptSheet 
        isOpen={isReceiptOpen} 
        onOpenChange={handleCloseReceipt} 
        status={txStatus === 'error' ? 'error' : 'success'} 
        amount={amount} 
        token={selectedToken} 
        recipientName={recipientProfile?.name || 'Target Node'} 
        recipientAddress={resolvedAddress} 
        txHash={txHash} 
        errorReason={receiptError} 
        fee={calculations?.totalWncCost + " WNC"} 
        networkName={activeNetwork?.name || 'Registry'} 
      />
    </div>
  );
}

export default function WncSendPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#050505]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><WncSendContent /></Suspense>
  );
}
