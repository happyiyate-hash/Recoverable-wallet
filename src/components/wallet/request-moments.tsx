'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Zap, 
  HandCoins, 
  Loader2, 
  ShieldCheck, 
  ChevronDown, 
  ArrowRight, 
  CheckCircle2, 
  Copy, 
  Share2, 
  QrCode as QrIcon,
  AlertCircle,
  ShieldOff,
  Lock,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@/contexts/wallet-provider';
import { useUser } from '@/contexts/user-provider';
import { useCurrency } from '@/contexts/currency-provider';
import TokenLogoDynamic from '../shared/TokenLogoDynamic';
import GlobalTokenSelector from '../shared/global-token-selector';
import type { AssetRow, PaymentRequest, UserProfile } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import QRCode from "react-qr-code";
import TransactionStatusCard from './transaction-status-card';
import TransactionReceiptSheet from './transaction-receipt-sheet';
import { ethers } from 'ethers';
import * as xrpl from 'xrpl';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/lib/services/notification-service';
import { WNC_TRANSACTION_FEE } from '@/lib/services/swap-fee-calculator';

/**
 * TECHNICAL ERROR MAPPER
 */
const mapTechnicalError = (err: any): string => {
  const msg = (err.message || String(err)).toLowerCase();

  if (msg.includes('insufficient funds') || msg.includes('insufficient balance')) {
    return "Insufficient Funds: Your node balance is too low to authorize this dispatch.";
  }
  if (msg.includes('user rejected')) {
    return "Transaction Cancelled: You rejected the request in your terminal.";
  }
  if (err.message) return `System Advisory: ${err.message}`;
  return "Dispatch Error: The transaction was rejected by the network protocol.";
};

/**
 * INSTITUTIONAL REQUEST CREATION CARD
 */
export function RequestCreateMoment({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { allAssets, viewingNetwork, accountNumber, prices } = useWallet();
  const { user, profile } = useUser();
  const { formatFiat } = useCurrency();
  const { toast } = useToast();

  const [step, setStep] = useState<'edit' | 'ready'>('edit');
  const [selectedToken, setSelectedToken] = useState<AssetRow | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const isAccountProtected = profile?.is_disabled || profile?.security_locked;

  const livePrice = useMemo(() => {
    if (!selectedToken || !prices) return 0;
    const priceId = (selectedToken.priceId || selectedToken.coingeckoId || selectedToken.address || '').toLowerCase();
    if (selectedToken.symbol === 'WNC') return prices['internal:wnc']?.price || 0.0006;
    return prices[priceId]?.price || selectedToken.priceUsd || 0;
  }, [selectedToken, prices]);

  const shareUrl = useMemo(() => requestId ? `${window.location.origin}/request/${requestId}` : '', [requestId]);

  useEffect(() => { 
    if (!selectedToken && allAssets.length > 0) setSelectedToken(allAssets[0]); 
  }, [allAssets, selectedToken]);

  const handleGenerate = async () => {
    if (!user || !selectedToken || !accountNumber || !supabase || isAccountProtected) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase.from('payment_requests').insert({
        requester_id: user.id,
        requester_account_number: accountNumber,
        chain_type: viewingNetwork.type || 'evm',
        token_symbol: selectedToken.symbol,
        token_address: selectedToken.isNative ? null : selectedToken.address,
        amount: parseFloat(amount),
        note: note.trim() || null
      }).select().single();

      if (error) throw error;

      setRequestId(data.id);
      setStep('ready');
      toast({ title: "Request Node Active", description: "P2P handshake generated successfully." });
    } catch (e: any) { 
      toast({
          variant: "destructive",
          title: "Protocol Error",
          description: e.message || "Failed to generate payment request."
      });
    } finally { 
      setIsCreating(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 md:items-center"
          >
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-[#0a0a0c] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-flow" />

              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <HandCoins className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Request Node</h3>
                      <p className="text-[8px] font-black uppercase text-primary opacity-60">P2P Handshake Protocol</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
                </div>

                <AnimatePresence mode="wait">
                  {step === 'edit' ? (
                    <motion.div key="edit" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                      {isAccountProtected && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3">
                          <ShieldOff className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-red-400 font-bold uppercase leading-relaxed">Requests are disabled due to account protection.</p>
                        </div>
                      )}

                      <section className="space-y-3">
                        <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Target Asset</Label>
                        <button onClick={() => !isAccountProtected && setIsSelectorOpen(true)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all disabled:opacity-20" disabled={isAccountProtected}>
                          <div className="flex items-center gap-3">
                            <TokenLogoDynamic logoUrl={selectedToken?.iconUrl} alt="token" size={32} chainId={selectedToken?.chainId} symbol={selectedToken?.symbol} name={selectedToken?.name} />
                            <div className="text-left"><p className="font-bold text-sm text-white">{selectedToken?.symbol}</p><p className="text-[9px] text-muted-foreground uppercase">{viewingNetwork.name}</p></div>
                          </div>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </section>

                      <section className="space-y-3">
                        <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Request Amount</Label>
                        <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 text-center shadow-inner">
                          <div className="flex items-baseline justify-center gap-2">
                            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={isAccountProtected} className="text-4xl font-black bg-transparent border-none p-0 h-auto text-center focus-visible:ring-0 tracking-tighter text-white" />
                            <span className="text-sm font-black text-white/20 uppercase">{selectedToken?.symbol}</span>
                          </div>
                          <p className="mt-2 text-[10px] font-bold text-primary">≈ {formatFiat((parseFloat(amount) || 0) * livePrice)}</p>
                        </div>
                      </section>

                      <Textarea placeholder="What's this for? (Optional)" value={note} onChange={(e) => setNote(e.target.value)} disabled={isAccountProtected} className="rounded-2xl bg-white/5 border-white/5 p-4 min-h-[100px] text-sm" />

                      <Button className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20" disabled={!amount || parseFloat(amount) <= 0 || isCreating || isAccountProtected} onClick={handleGenerate}>
                        {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : isAccountProtected ? "Lockdown Active" : "Authorize Request Node"}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div key="ready" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 py-2">
                      <div className="text-center space-y-1">
                        <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mx-auto mb-2 border border-green-500/20"><CheckCircle2 className="w-6 h-6" /></div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight">Handshake Ready</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Share this node to receive payment</p>
                      </div>

                      <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl relative group">
                        <QRCode value={shareUrl} size={160} level="H" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="p-1.5 bg-white rounded-lg shadow-xl border border-zinc-100">
                            <TokenLogoDynamic logoUrl={selectedToken?.iconUrl} alt="Token" size={28} symbol={selectedToken?.symbol} name={selectedToken?.name} />
                          </div>
                        </div>
                      </div>

                      <div className="w-full space-y-3">
                        <button onClick={() => { navigator.clipboard.writeText(shareUrl); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }} className={cn("w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all", isCopied ? "bg-green-500/10 border-green-500/30" : "bg-white/5 border-white/10")}>
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isCopied ? "bg-green-500/20 text-green-500" : "bg-primary/20 text-primary")}><Copy className="w-3.5 h-3.5" /></div>
                            <p className="text-[9px] text-white/60 truncate font-mono">{shareUrl}</p>
                          </div>
                          <span className="text-[9px] font-black uppercase text-primary shrink-0">{isCopied ? "Copied" : "Copy"}</span>
                        </button>
                        <Button onClick={() => navigator.share({ title: 'Payment Request', url: shareUrl })} className="w-full h-14 rounded-2xl gap-3 font-black text-sm uppercase bg-primary shadow-xl shadow-primary/20"><Share2 className="w-4 h-4" /> Share Node</Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <GlobalTokenSelector isOpen={isSelectorOpen} onOpenChange={setIsSelectorOpen} onSelect={(t) => setSelectedToken(t)} />
    </>
  );
}

/**
 * INSTITUTIONAL REQUEST REVIEW MOMENT
 */
export function RequestReviewMoment({ requestId, onClose }: { requestId: string, onClose: () => void }) {
  const { wallets, infuraApiKey, allChainsMap, allAssets, refresh, prices } = useWallet();
  const { profile: currentUserProfile, refreshProfile } = useUser();
  const { formatFiat } = useCurrency();
  const { toast } = useToast();

  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [requester, setRequester] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [isStatusVisible, setIsStatusVisible] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [isCardVisible, setIsCardVisible] = useState(true);

  // PROTECTION LOCK
  const isAccountProtected = currentUserProfile?.is_disabled || currentUserProfile?.security_locked;

  const activeToken = useMemo(() => {
    if (!request) return null;
    return allAssets.find(a => a.symbol === request.token_symbol) || null;
  }, [request, allAssets]);

  const livePrice = useMemo(() => {
    if (!activeToken || !prices) return 0;
    const priceId = (activeToken.priceId || activeToken.coingeckoId || activeToken.address || '').toLowerCase();
    if (activeToken.symbol === 'WNC') return prices['internal:wnc']?.price || 0.0006;
    return prices[priceId]?.price || activeToken.priceUsd || 0;
  }, [activeToken, prices]);

  useEffect(() => {
    async function fetchRequest() {
      if (!requestId || !supabase) return;
      try {
        const { data: requestData } = await supabase.from('payment_requests').select('*').eq('id', requestId).single();
        if (requestData) {
          setRequest(requestData);
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', requestData.requester_id).single();
          setRequester(profileData);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    fetchRequest();
  }, [requestId]);

  const handlePay = async () => {
    if (!wallets || !request || !requester || !currentUserProfile || isAccountProtected) return;
    
    setIsCardVisible(false);
    setIsStatusVisible(true);
    setTxStatus('pending');
    setIsSubmitting(true);

    try {
      const chainType = request.chain_type;
      const amountStr = request.amount.toString();
      const amountNum = request.amount;
      let finalTxHash = '';

      if (request.token_symbol === 'WNC') {
        const { data, error: rpcError } = await supabase!.rpc('transfer_wnc_universal', { 
          p_receiver_id: requester.id, 
          p_destination_type: 'user',
          p_amount: Math.floor(request.amount),
          p_reference: `Request Fulfillment: ${request.id}`
        });
        if (rpcError) throw new Error(rpcError.message);
        if (!data?.success) throw new Error(data?.message || "Atomic settlement failed.");

        finalTxHash = `int_req_${Math.random().toString(36).substring(7)}`;
        setTxHash(finalTxHash);

        await notificationService.requestApprovedAlert({
          requestId: request.id,
          requesterId: requester.id,
          approverId: currentUserProfile.id,
          approverName: currentUserProfile.name,
          amount: amountNum
        });

        await notificationService.requestPaidAlert({
          payerId: currentUserProfile.id,
          payeeId: requester.id,
          payeeName: requester.name,
          amount: amountNum
        });
      } 
      else if (chainType === 'xrp') {
        const xrpWallet = wallets.find(w => w.type === 'xrp');
        const network = Object.values(allChainsMap).find(c => c.type === 'xrp');
        const client = new xrpl.Client(network?.rpcUrl || 'wss://xrplcluster.com');
        const recipientAddress = requester.xrp_address;
        if (!recipientAddress) throw new Error("Recipient XRP node not initialized.");

        try {
          await Promise.race([
            client.connect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('XRPL_CONNECTION_TIMEOUT')), 10000))
          ]);
          const wallet = xrpl.Wallet.fromSeed(xrpWallet!.seed!);
          const prepared = await client.autofill({ TransactionType: "Payment", Account: wallet.address, Amount: xrpl.xrpToDrops(amountStr), Destination: recipientAddress });
          const result = await client.submitAndWait(wallet.sign(prepared).tx_blob);
          if (result.result.meta && typeof result.result.meta !== 'string' && (result.result.meta as any).TransactionResult === "tesSUCCESS") {
            finalTxHash = result.result.hash;
            setTxHash(finalTxHash);
          }
          else throw new Error("XRPL Fail");
        } finally {
          if (client.isConnected()) await client.disconnect();
        }
      } else {
        if (!infuraApiKey) throw new Error("Connection Error: Infura key missing.");
        const evmWallet = wallets.find(w => w.type === 'evm');
        const network = Object.values(allChainsMap).find(c => c.type === 'evm');
        const provider = new ethers.JsonRpcProvider(network!.rpcUrl.replace('{API_KEY}', infuraApiKey), undefined, { staticNetwork: true });
        const wallet = new ethers.Wallet(evmWallet!.privateKey!, provider);
        const recipientAddress = requester.evm_address;
        if (!recipientAddress) throw new Error("Recipient EVM node not initialized.");
        const decimals = 18; 
        let tx;
        if (!request.token_address) tx = await wallet.sendTransaction({ to: recipientAddress, value: ethers.parseEther(amountStr) });
        else {
          const contract = new ethers.Contract(request.token_address, ["function transfer(address to, uint256 amount) returns (bool)"], wallet);
          tx = await contract.transfer(recipientAddress, ethers.parseUnits(amountStr, decimals));
        }
        finalTxHash = tx.hash;
        setTxHash(finalTxHash);
      }

      await supabase?.from('payment_requests').update({ status: 'paid' }).eq('id', requestId);
      setTxStatus('success');
      await refreshProfile(); refresh();

      setTimeout(() => {
        setIsStatusVisible(false);
        setIsReceiptOpen(true);
      }, 3000);

    } catch (e: any) {
      setTxStatus('error');
      setReceiptError(mapTechnicalError(e));
      setTimeout(() => {
        setIsStatusVisible(false);
        setIsReceiptOpen(true);
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !request || !requester) return null;

  const isAlreadyPaid = request.status === 'paid';
  const userBalance = parseFloat(activeToken?.balance || '0');
  const totalDebit = request.amount + (request.token_symbol === 'WNC' ? WNC_TRANSACTION_FEE : 0);
  const hasInsufficientFunds = totalDebit > userBalance;

  return (
    <>
      <AnimatePresence>
        {isCardVisible && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 md:items-center"
          >
            <motion.div 
              initial={{ y: -500, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -500, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-[#0a0a0c] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-flow" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Payment Request Node</h3>
                  <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
                </div>

                <div className="flex flex-col items-center text-center space-y-8 mb-10">
                  {isAccountProtected && (
                    <div className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 text-left">
                      <ShieldOff className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-red-400 font-bold uppercase leading-relaxed">
                        Account actions are disabled for protection.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between w-full px-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <Avatar className="w-16 h-16 rounded-2xl border border-white/10 shadow-xl bg-black">
                          <AvatarImage src={currentUserProfile?.photo_url} />
                          <AvatarFallback className="bg-primary/20 font-black">{currentUserProfile?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-2 -right-2 bg-black rounded-lg p-1 border border-white/10 shadow-xl z-20">
                          <TokenLogoDynamic logoUrl={activeToken?.iconUrl} alt="T" size={24} chainId={activeToken?.chainId || 1} symbol={activeToken?.symbol || 'T'} name={activeToken?.name} />
                        </div>
                      </div>
                      <span className="text-[8px] font-black text-white/40 uppercase">You</span>
                    </div>
                    <div className="flex-1 px-6 relative">
                      <div className="w-full h-px bg-primary/20 relative"><motion.div animate={{ x: [-20, 20], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary"><ArrowRight className="w-4 h-4" /></motion.div></div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <Avatar className="w-16 h-16 rounded-2xl border border-white/10 shadow-xl bg-black">
                          <AvatarImage src={requester.photo_url} />
                          <AvatarFallback className="bg-primary/20 font-black">{requester.name?.[0]}</AvatarFallback>
                          <div className="absolute -bottom-2 -right-2 bg-black rounded-lg p-1 border border-white/10 shadow-xl z-20">
                            <TokenLogoDynamic logoUrl={activeToken?.iconUrl} alt="T" size={24} chainId={activeToken?.chainId || 1} symbol={activeToken?.symbol || 'T'} name={activeToken?.name} />
                          </div>
                        </Avatar>
                      </div>
                      <span className="text-[8px] font-black text-white/40 uppercase truncate w-16 text-center">@{requester.name}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Amount Requested</p>
                    <h2 className={cn("text-5xl font-black tracking-tighter", hasInsufficientFunds ? "text-red-400" : "text-white")}>
                      {request.amount} {request.token_symbol}
                    </h2>
                    <p className="text-xs font-bold text-primary">≈ {formatFiat(request.amount * livePrice)}</p>

                    {hasInsufficientFunds && (
                      <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center gap-2 animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">
                          Insufficient Funds ({userBalance.toFixed(2)})
                        </span>
                      </div>
                    )}
                  </div>

                  {request.note && <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-muted-foreground italic w-full">"{request.note}"</div>}
                </div>

                <div className="space-y-3">
                  {!isAlreadyPaid ? (
                    <Button 
                      onClick={handlePay} 
                      disabled={isSubmitting || hasInsufficientFunds || isAccountProtected} 
                      className={cn(
                        "w-full h-16 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl transition-all duration-300",
                        (hasInsufficientFunds || isAccountProtected) ? "bg-zinc-900 border-zinc-950 opacity-50 grayscale cursor-not-allowed" : "bg-primary hover:bg-primary/90 shadow-primary/20"
                      )}
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : isAccountProtected ? "Account Protected" : "Authorize Settlement"}
                    </Button>
                  ) : (
                    <div className="p-5 rounded-[2rem] bg-green-500/10 border border-green-500/20 flex gap-4"><CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" /><div className="text-left"><p className="text-xs font-black text-green-500 uppercase">Paid & Locked</p><p className="text-[10px] text-green-400 opacity-80 leading-relaxed">This request node has already been settled.</p></div></div>
                  )}
                  <Button variant="ghost" className="w-full h-12 rounded-2xl font-bold text-muted-foreground" onClick={onClose}>Dismiss</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TransactionStatusCard 
        isVisible={isStatusVisible} 
        status={txStatus} 
        senderName="You" 
        senderAvatar={currentUserProfile?.photo_url} 
        recipientName={requester.name} 
        recipientAvatar={requester.photo_url} 
        token={{ symbol: request.token_symbol, iconUrl: activeToken?.iconUrl, chainId: activeToken?.chainId || 1, name: activeToken?.name }} 
        isRawAddress={false} 
      />

      <TransactionReceiptSheet 
        isOpen={isReceiptOpen} 
        onOpenChange={(open) => {
          setIsReceiptOpen(open);
          if (!open) onClose();
        }} 
        status={txStatus === 'error' ? 'error' : 'success'} 
        amount={request.amount.toString()} 
        token={activeToken} 
        recipientName={requester.name} 
        recipientAddress={request.chain_type === 'evm' ? requester.evm_address! : request.chain_type === 'xrp' ? requester.xrp_address! : requester.polkadot_address!} 
        txHash={txHash} 
        errorReason={receiptError} 
        fee={request.token_symbol === 'WNC' ? `${WNC_TRANSACTION_FEE} WNC` : "Standard"} 
        networkName={request.chain_type.toUpperCase()} 
      />
    </>
  );
}