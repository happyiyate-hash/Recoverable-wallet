'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/wallet-provider';
import { useUser } from '@/contexts/user-provider';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Info, 
  Loader2, 
  Trash2, 
  ArrowLeft, 
  KeyRound, 
  Copy, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ShieldCheck,
  Zap,
  Lock,
  ShieldOff,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { cn } from '@/lib/utils';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

/**
 * INSTITUTIONAL API KEY REGISTRY
 * Version: 11.0.0 (Crash Resolution & Matte Refinement)
 * 
 * Rules:
 * 1. ZERO-CRASH: All kinetic nodes (motion) are strictly imported.
 * 2. MATTE SURFACE: Uses Solid Charcoal foundations for an expensive feel.
 * 3. TOAST PROTOCOL: Replaces browser alerts with high-fidelity system toasts.
 */
export default function ApiKeysPage() {
  const { 
    infuraApiKey, 
    setInfuraApiKey, 
    alchemyApiKey, 
    setAlchemyApiKey,
    refresh 
  } = useWallet();
  const { profile } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isCopied, copy] = useCopyToClipboard();

  // COMPLIANCE SENTINELS
  const isAccountProtected = profile?.is_disabled || profile?.security_locked;

  // INFURA STATE
  const [infuraInput, setInfuraInput] = useState('');
  const [isInfuraVisible, setIsInfuraVisible] = useState(false);
  const [isInfuraValidating, setIsInfuraValidating] = useState(false);
  const [infuraError, setInfuraError] = useState<string | null>(null);

  // ALCHEMY STATE
  const [alchemyInput, setAlchemyInput] = useState('');
  const [isAlchemyVisible, setIsAlchemyVisible] = useState(false);
  const [isAlchemyValidating, setIsAlchemyValidating] = useState(false);
  const [alchemyError, setAlchemyError] = useState<string | null>(null);

  useEffect(() => {
    if (infuraApiKey) setInfuraInput(infuraApiKey);
    if (alchemyApiKey) setAlchemyInput(alchemyApiKey);
  }, [infuraApiKey, alchemyApiKey]);

  const handleSaveInfura = async () => {
    if (!infuraInput || isAccountProtected) return;
    setIsInfuraValidating(true);
    setInfuraError(null);
    try {
      // Direct Handshake Audit
      const provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${infuraInput}`, undefined, { staticNetwork: true });
      await provider.getBlockNumber();
      await setInfuraApiKey(infuraInput);
      
      toast({ title: "Infura Node Authorized", description: "Network handshake verified." });
      refresh();
    } catch (e) {
      setInfuraError("Invalid Infura Key Node. Please verify credentials.");
      toast({ variant: "destructive", title: "Authorization Denied", description: "The Infura node rejected the connection." });
    } finally {
      setIsInfuraValidating(false);
    }
  };

  const handleSaveAlchemy = async () => {
    if (!alchemyInput || isAccountProtected) return;
    setIsAlchemyValidating(true);
    setAlchemyError(null);
    try {
      // Cross-Chain Protocol Audit
      const res = await fetch(`https://solana-mainnet.g.alchemy.com/v2/${alchemyInput}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' })
      });
      if (!res.ok) throw new Error("Invalid Node");
      await setAlchemyApiKey(alchemyInput);
      
      toast({ title: "Alchemy Node Authorized", description: "Multi-chain registry synchronized." });
      refresh();
    } catch (e) {
      setAlchemyError("Invalid Alchemy Key Node. Please verify credentials.");
      toast({ variant: "destructive", title: "Authorization Denied", description: "The Alchemy node rejected the connection." });
    } finally {
      setIsAlchemyValidating(false);
    }
  };

  const KeyCard = ({ 
    label, 
    value, 
    input, 
    setInput, 
    onSave, 
    onClear, 
    isVisible, 
    setIsVisible, 
    isLoading,
    error,
    description,
    icon: Icon
  }: any) => (
    <div className="p-6 rounded-[2.5rem] bg-[#0a0a0c] border border-white/5 space-y-6 shadow-2xl relative overflow-hidden group">
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-lg border border-primary/20 transition-transform group-hover:scale-105")}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-white">{label} Node</h3>
            <p className="text-[8px] font-black uppercase text-white/40 tracking-widest leading-none mt-1">{description}</p>
          </div>
        </div>
        {value && !error && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <ShieldCheck className="w-3 h-3 text-green-500" />
            <span className="text-[8px] font-black uppercase text-green-500">Authenticated</span>
          </div>
        )}
      </div>

      <div className="space-y-4 relative z-10">
        <div className="space-y-2">
          <div className="relative">
            <Input 
              type={(isVisible && !isAccountProtected) ? "text" : "password"}
              value={isAccountProtected ? "••••••••••••••••" : input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Paste ${label} key...`}
              disabled={isAccountProtected || isLoading}
              className={cn(
                "h-14 bg-black/60 border-white/10 rounded-2xl px-4 font-mono text-sm focus-visible:ring-primary disabled:opacity-20 shadow-inner",
                error && "border-red-500/30 bg-red-500/5"
              )}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button 
                onClick={() => !isAccountProtected && setIsVisible(!isVisible)} 
                className="h-10 w-10 rounded-xl text-white/20 hover:text-white flex items-center justify-center transition-all" 
                disabled={isAccountProtected}
              >
                {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {value && !isAccountProtected && (
                <button 
                  onClick={() => copy(value)} 
                  className="h-10 w-10 rounded-xl text-white/20 hover:text-primary flex items-center justify-center transition-all"
                >
                  {isCopied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
          
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                className="flex items-center gap-2 pl-2"
              >
                <AlertCircle className="w-3 h-3 text-red-500" />
                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={onSave}
            disabled={isLoading || !input || input === value || isAccountProtected}
            className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-black transition-all active:scale-95"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isAccountProtected ? "Node Gated" : "Authorize Node"}
          </Button>
          {value && !isAccountProtected && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClear} 
              className="h-14 w-14 rounded-2xl bg-red-500/5 text-red-500/40 hover:bg-red-500 hover:text-white border border-transparent hover:border-red-500/20 transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
      <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-primary/5 blur-3xl rounded-full opacity-50" />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-foreground relative overflow-hidden">
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl hover:bg-white/5">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col items-center">
          <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white/90">Infrastructure</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <KeyRound className="w-2.5 h-2.5 text-primary" />
            <span className="text-[8px] text-primary font-black uppercase tracking-tighter">Registry Nodes</span>
          </div>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full pb-32 overflow-y-auto thin-scrollbar relative z-10">
        
        {/* PROTECTION BANNER */}
        <AnimatePresence>
          {isAccountProtected && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: -50, opacity: 0 }}
              className="p-6 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex gap-4 shadow-2xl backdrop-blur-xl"
            >
              <ShieldOff className="w-8 h-8 text-red-500 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-black text-red-500 uppercase tracking-widest">Protocol Lockdown</p>
                <p className="text-xs text-red-400/80 leading-relaxed font-medium">
                  API management is disabled due to account protection. Visit settings to authorize hardware access.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="space-y-4">
          <div className="p-6 rounded-[2.5rem] bg-primary/5 border border-primary/20 shadow-2xl relative overflow-hidden">
             <div className="flex items-start gap-4 relative z-10">
               <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
               <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Registry Protocol</h3>
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                    Private RPC nodes ensure the highest speed and zero-logging privacy for your global transactions. 
                    Keys are <span className="text-white font-bold">AES-256 encrypted</span> and stored in your cloud vault.
                  </p>
               </div>
             </div>
             <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
          </div>
        </section>

        <section className="space-y-4">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] px-2">Primary Registry Nodes</p>
          <div className="space-y-4">
            <KeyCard 
              label="Infura" 
              value={infuraApiKey}
              input={infuraInput}
              setInput={setInfuraInput}
              onSave={handleSaveInfura}
              onClear={() => { setInfuraApiKey(null); setInfuraInput(''); }}
              isVisible={isInfuraVisible}
              setIsVisible={setIsInfuraVisible}
              isLoading={isInfuraValidating}
              error={infuraError}
              description="EVM & Layer 2 Handshake"
              icon={Zap}
            />

            <KeyCard 
              label="Alchemy" 
              value={alchemyApiKey}
              input={alchemyInput}
              setInput={setAlchemyInput}
              onSave={handleSaveAlchemy}
              onClear={() => { setAlchemyApiKey(null); setAlchemyInput(''); }}
              isVisible={isAlchemyVisible}
              setIsVisible={setIsAlchemyVisible}
              isLoading={isAlchemyValidating}
              error={alchemyError}
              description="Multi-Chain UTXO Registry"
              icon={ShieldCheck}
            />
          </div>
        </section>

        <div className="pt-10 flex flex-col items-center gap-3 opacity-20 pb-10">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            <span className="text-[8px] font-black uppercase tracking-widest text-white">Handshake Secured v11.0</span>
          </div>
        </div>
      </main>
    </div>
  );
}
