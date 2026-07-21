'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Copy, Share2, Info, X, Zap } from 'lucide-react';
import { useCurrency } from '@/contexts/currency-provider';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import TokenLogoDynamic from '../shared/TokenLogoDynamic';

interface TransactionReceiptSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  status: 'success' | 'error';
  amount: string;
  token: any;
  recipientName: string;
  recipientAddress: string;
  txHash?: string;
  errorReason?: string;
  fee: string;
  networkName: string;
}

/**
 * INSTITUTIONAL TOP-SLIDING RECEIPT CARD
 * Version: 5.0.0 (Cinematic Completion Node)
 */
export default function TransactionReceiptSheet({
  isOpen,
  onOpenChange,
  status,
  amount,
  token,
  recipientName,
  recipientAddress,
  txHash,
  errorReason,
  fee,
  networkName
}: TransactionReceiptSheetProps) {
  const { formatFiat } = useCurrency();
  const { toast } = useToast();
  
  const price = token?.priceUsd || 0;
  const amountUsd = (parseFloat(amount) || 0) * price;

  const handleCopyHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      toast({ title: "Hash Copied" });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ y: -500, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: -500, x: '-50%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[140] w-[92vw] max-w-[400px] bg-[#0a0a0c] border border-white/10 rounded-[3rem] p-6 shadow-2xl overflow-hidden"
          >
            <div className={cn(
              "absolute top-0 inset-x-0 h-1.5",
              status === 'success' ? "bg-green-500" : "bg-red-500"
            )} />

            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Node Payout Record</span>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center space-y-6 mb-8">
              <div className={cn(
                "w-20 h-20 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative",
                status === 'success' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
              )}>
                {status === 'success' ? <CheckCircle2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                <div className="absolute -bottom-2 -right-2 bg-black rounded-xl p-1.5 border border-white/10 shadow-2xl">
                    <TokenLogoDynamic logoUrl={token?.iconUrl} alt={token?.symbol || 'T'} size={24} chainId={token?.chainId} symbol={token?.symbol} name={token?.name} />
                </div>
              </div>
              
              <div className="space-y-1">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                  {status === 'success' ? 'Settled' : 'Dispatch Failed'}
                </h2>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.3em] opacity-60">
                  {status === 'success' ? 'Blockchain Handshake Verified' : 'Registry Connection Aborted'}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className={cn(
                "border rounded-3xl p-6 flex flex-col items-center gap-1",
                status === 'error' ? "bg-red-500/5 border-red-500/20" : "bg-white/[0.02] border-white/5 shadow-inner"
              )}>
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                  Value Dispatched
                </p>
                <h3 className="text-3xl font-black text-white">{amount} {token?.symbol}</h3>
                <p className="text-[10px] font-bold text-primary">≈ {formatFiat(amountUsd)}</p>
              </div>

              {status === 'error' ? (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3">
                  <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-red-400/80 leading-relaxed">
                    {errorReason || "Unknown protocol rejection node."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <p className="text-[8px] font-black text-white/20 uppercase">Recipient</p>
                    <p className="text-[10px] font-black text-white uppercase truncate">@{recipientName}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <p className="text-[8px] font-black text-white/20 uppercase">Ecosystem</p>
                    <p className="text-[10px] font-black text-white uppercase truncate">{networkName}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button 
                className="w-full h-16 rounded-[2rem] font-black text-sm uppercase tracking-widest bg-primary shadow-xl shadow-primary/20" 
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
              {txHash && (
                <Button 
                  variant="ghost" 
                  className="w-full h-12 rounded-2xl text-[9px] font-black uppercase text-white/40 hover:text-white"
                  onClick={handleCopyHash}
                >
                  <Copy className="w-3.5 h-3.5 mr-2" /> Copy Transaction ID
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
