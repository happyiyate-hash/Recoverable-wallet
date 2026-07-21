'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Plus, 
  Loader2, 
  Zap,
  Tag,
  Briefcase,
  Coins,
  ChevronDown,
  ArrowRight,
  Info,
  Lock,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/contexts/user-provider';
import { useWallet } from '@/contexts/wallet-provider';
import { escrowService } from '@/lib/services/escrow-service';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import GlobalTokenSelector from '@/components/shared/global-token-selector';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import type { AssetRow } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * INSTITUTIONAL ESCROW CREATION TERMINAL
 * Version: 8.0.0 (KYC Policy Update)
 */
export default function CreateListingPage() {
  const router = useRouter();
  const { user, profile } = useUser();
  const { viewingNetwork } = useWallet();
  const { toast } = useToast();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<'product' | 'crypto' | 'private'>('crypto');
  
  // Account Lookup Node
  const [accountInput, setAccountInput] = useState('');
  const debouncedAccount = useDebounce(accountInput, 500);
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Form State
  const [selectedToken, setSelectedToken] = useState<AssetRow | null>(null);
  const [amount, setAmount] = useState('');
  const [priceWnc, setPriceWnc] = useState('');
  const [description, setDescription] = useState('');
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // PROTECTION LOCK
  const isAccountProtected = profile?.is_disabled || profile?.security_locked;

  // RESOLVE TARGET IDENTITY
  useEffect(() => {
    async function resolve() {
      if (type !== 'private' || !debouncedAccount || debouncedAccount.length < 5) {
        setTargetProfile(null);
        return;
      }
      setIsResolving(true);
      const profile = await escrowService.resolveProfileByAccount(debouncedAccount);
      setTargetProfile(profile);
      setIsResolving(false);
    }
    resolve();
  }, [debouncedAccount, type]);

  const handlePostEscrow = async () => {
    if (!user || !priceWnc || !description || isAccountProtected) {
        toast({ variant: "destructive", title: "Input Required", description: "Please complete all mandatory nodes." });
        return;
    }

    if (type === 'private' && !targetProfile) {
        toast({ variant: "destructive", title: "Recipient Required", description: "Please provide a valid recipient Account ID." });
        return;
    }

    setIsCreating(true);
    try {
      const result = await escrowService.createListing({
        sellerId: user.id,
        type,
        asset: type === 'crypto' ? selectedToken?.symbol : undefined,
        amount: amount ? parseFloat(amount) : undefined,
        priceWnc: parseFloat(priceWnc),
        description: description.trim(),
        targetBuyerId: targetProfile?.id
      });

      toast({ title: "Trust Node Active", description: type === 'private' ? "Request sent to target node." : "Listing is now live in marketplace." });
      
      if (type === 'private' && (result as any).tradeId) {
        router.push(`/escrow/${(result as any).tradeId}`);
      } else {
        router.push('/escrow');
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Post Failed", description: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-foreground relative">
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
        <Button variant="ghost" size="icon" onClick={() => step === 2 ? setStep(1) : router.back()} className="rounded-xl">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Button>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-xs font-black uppercase tracking-[0.2em] leading-none text-white">Establish Trust</h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Plus className="w-2.5 h-2.5 text-primary" />
            <span className="text-[8px] text-primary font-black uppercase tracking-tighter">New Escrow Node</span>
          </div>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full pb-32 overflow-y-auto thin-scrollbar">
        
        {/* ACCOUNT PROTECTION BANNER */}
        <AnimatePresence>
          {isAccountProtected && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex gap-4 shadow-2xl">
              <ShieldOff className="w-6 h-6 text-red-500 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-black text-red-500 uppercase tracking-widest">Account Protected</p>
                <p className="text-[11px] text-red-400/80 leading-relaxed font-medium">
                  This feature is disabled due to account protection. Enable your account in settings to access.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <section className="space-y-4 text-center py-4">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">Select Trade Protocol</h2>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Define the nature of your transaction</p>
              </section>

              <div className="grid grid-cols-1 gap-3">
                <ProtocolOption 
                  active={type === 'crypto'} 
                  onClick={() => setType('crypto')}
                  icon={Coins}
                  label="Crypto P2P"
                  desc="Direct cross-chain coin selling"
                />
                <ProtocolOption 
                  active={type === 'product'} 
                  onClick={() => setType('product')}
                  icon={Briefcase}
                  label="Goods & Services"
                  desc="Physical items or digital work"
                />
                <ProtocolOption 
                  active={type === 'private'} 
                  onClick={() => setType('private')}
                  icon={Lock}
                  label="Private / Direct"
                  desc="Request payment from specific Account ID"
                />
              </div>

              <Button 
                onClick={() => setStep(2)}
                className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 gap-3 mt-4"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* TARGET RECIPIENT NODE (For Private Type) */}
              {type === 'private' && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Recipient Node ID</Label>
                    {isResolving && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  </div>
                  
                  <div className="relative">
                    <Input 
                      placeholder="Enter 10-digit Account ID" 
                      value={accountInput} 
                      onChange={(e) => setAccountInput(e.target.value.replace(/\D/g, ''))} 
                      className="h-14 bg-white/5 border-white/10 rounded-2xl pl-4 pr-12 text-white font-bold"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  </div>

                  <AnimatePresence>
                    {targetProfile ? (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-4">
                        <Avatar className="w-10 h-10 rounded-xl border border-white/10">
                          <AvatarImage src={targetProfile.photo_url} />
                          <AvatarFallback className="bg-zinc-900 text-primary font-black">{targetProfile.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-black text-white uppercase">@{targetProfile.name}</p>
                          <p className="text-[8px] font-black text-primary uppercase tracking-widest">Verified Identity Node</p>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                      </motion.div>
                    ) : debouncedAccount.length >= 10 && !isResolving && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        <span className="text-[9px] font-black text-red-500 uppercase">Registry: Node Not Found</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              )}

              <div className="space-y-6">
                {type === 'crypto' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Smart Token Selector</Label>
                      <button 
                        onClick={() => !isAccountProtected && setIsSelectorOpen(true)}
                        disabled={isAccountProtected}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all disabled:opacity-20"
                      >
                        <div className="flex items-center gap-3">
                          <TokenLogoDynamic logoUrl={selectedToken?.iconUrl} size={32} symbol={selectedToken?.symbol} name={selectedToken?.name} chainId={selectedToken?.chainId} />
                          <div className="text-left">
                            <p className="text-sm font-black text-white uppercase">{selectedToken?.symbol || 'Select Token'}</p>
                            <p className="text-[8px] font-black text-primary uppercase">{viewingNetwork.name} Node</p>
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Amount to Deliver</Label>
                      <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={isAccountProtected} className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold shadow-inner" />
                    </div>
                  </div>
                )}

                {(type === 'product' || type === 'private') && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Trade Label</Label>
                    <Input placeholder={type === 'private' ? "Reference Name (e.g. Design Work)" : "Product/Service Name"} value={description} onChange={(e) => setDescription(e.target.value)} disabled={isAccountProtected} className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold shadow-inner" />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Price (in WNC)</Label>
                  <div className="relative group">
                    <Input type="number" placeholder="0" value={priceWnc} onChange={(e) => setPriceWnc(e.target.value)} disabled={isAccountProtected} className="h-16 bg-white/5 border-white/10 rounded-[2rem] text-3xl font-black pl-8 pr-20 focus:border-primary/50 transition-all shadow-2xl" />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-black text-primary uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20">WNC</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Institutional Terms</Label>
                  <Textarea 
                    placeholder="Describe delivery conditions, timeframe, and nodes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isAccountProtected}
                    className="min-h-[140px] bg-white/5 border-white/10 rounded-[2rem] p-6 text-sm leading-relaxed font-medium shadow-inner"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed uppercase font-black tracking-tighter">
                  Registry Lock Active: Funds will be held in the trust node until buyer authorization.
                </p>
              </div>

              <Button 
                disabled={!priceWnc || !description || isCreating || (type === 'private' && !targetProfile) || isAccountProtected}
                onClick={handlePostEscrow}
                className={cn(
                  "w-full h-16 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 gap-3 mt-4 transition-all",
                  isAccountProtected ? "bg-zinc-900 border-zinc-950 opacity-50 grayscale cursor-not-allowed" : "bg-primary hover:bg-primary/90"
                )}
              >
                {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : isAccountProtected ? "Account Protected" : <><Zap className="w-5 h-5 fill-current" /> Broadcast Trust Node</>}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <GlobalTokenSelector 
        isOpen={isSelectorOpen} 
        onOpenChange={setIsSelectorOpen} 
        onSelect={(t) => { setSelectedToken(t); setIsSelectorOpen(false); }}
        title="Select Trade Asset"
      />
    </div>
  );
}

function ProtocolOption({ active, onClick, icon: Icon, label, desc }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-6 rounded-[2.5rem] border transition-all flex items-center gap-5 group relative overflow-hidden shadow-xl text-left",
        active ? "bg-primary/10 border-primary/50" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"
      )}
    >
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg",
        active ? "bg-primary/20 text-primary" : "bg-white/5 text-white/40"
      )}>
        <Icon className="w-7 h-7" />
      </div>
      <div className="flex-1">
        <span className={cn("text-sm font-black uppercase tracking-widest block leading-none mb-1.5", active ? "text-white" : "text-white/60")}>{label}</span>
        <span className="text-[9px] uppercase font-bold opacity-40 leading-none">{desc}</span>
      </div>
      {active && (
        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
      )}
    </button>
  );
}
