
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  History, 
  HandCoins, 
  Loader2, 
  ShieldCheck, 
  ChevronRight, 
  Search, 
  CheckCircle2, 
  Zap, 
  Clock, 
  X,
  Share2,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWallet } from '@/contexts/wallet-provider';
import { useUser } from '@/contexts/user-provider';
import { useCurrency } from '@/contexts/currency-provider';
import { supabase } from '@/lib/supabase/client';
import type { PaymentRequest, AssetRow } from '@/lib/types';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from "react-qr-code";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from '@/hooks/use-toast';

export default function MyRequestsPage() {
    const router = useRouter();
    const { user } = useUser();
    const { allAssets, allChainsMap, prices } = useWallet();
    const { formatFiat } = useCurrency();
    const { toast } = useToast();

    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (!user || !supabase) return;

        const fetchRequests = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('payment_requests')
                    .select('*')
                    .eq('requester_id', user.id)
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    setRequests(data as PaymentRequest[]);
                }
            } catch (e) {
                console.error("Fetch requests failed:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRequests();
    }, [user]);

    const filteredRequests = useMemo(() => {
        return requests.filter(r => 
            r.token_symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.note && r.note.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [requests, searchTerm]);

    const getAssetForRequest = (req: PaymentRequest): AssetRow | undefined => {
        // Internal WNC mapping
        if (req.token_symbol === 'WNC') {
            return allAssets.find(a => a.symbol === 'WNC');
        }
        // Chain specific mapping
        return allAssets.find(a => a.symbol === req.token_symbol);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        toast({ title: "Link Copied" });
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="flex flex-col min-h-screen bg-transparent text-foreground">
            <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </Button>
                <div className="flex flex-col items-center text-center">
                    <h1 className="text-xs font-black uppercase tracking-[0.2em] leading-none text-white/90">Request Registry</h1>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <HandCoins className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[8px] text-primary font-black uppercase tracking-tighter">P2P Handshakes</span>
                    </div>
                </div>
                <div className="w-10" />
            </header>

            <main className="flex-1 p-6 space-y-6 max-w-lg mx-auto w-full pb-32">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-primary/10 rounded-2xl blur opacity-25 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative bg-white/[0.03] border border-white/10 rounded-2xl p-1">
                        <div className="flex items-center gap-3 px-4">
                            <Search className="w-4 h-4 text-zinc-600" />
                            <Input 
                                placeholder="Search by asset or note..." 
                                className="bg-transparent border-none focus-visible:ring-0 text-sm h-12"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Auditing Registry...</p>
                        </div>
                    ) : filteredRequests.length > 0 ? (
                        filteredRequests.map((req, i) => {
                            const asset = getAssetForRequest(req);
                            const priceId = (asset?.priceId || asset?.coingeckoId || asset?.address || '').toLowerCase();
                            const livePrice = prices[priceId]?.price || asset?.priceUsd || 0;
                            const isPaid = req.status === 'paid';
                            const isPending = req.status === 'pending';

                            return (
                                <motion.div 
                                    key={req.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => setSelectedRequest(req)}
                                    className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between hover:bg-white/[0.04] transition-all cursor-pointer group active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <TokenLogoDynamic 
                                                logoUrl={asset?.iconUrl} 
                                                size={44} 
                                                chainId={asset?.chainId} 
                                                symbol={req.token_symbol} 
                                                name={asset?.name || req.token_symbol}
                                                alt="token"
                                            />
                                            <AnimatePresence mode="wait">
                                                {isPaid ? (
                                                    <motion.div 
                                                        key="paid-badge"
                                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                        className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-[#050505] shadow-lg z-10"
                                                    >
                                                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                                    </motion.div>
                                                ) : isPending ? (
                                                    <motion.div 
                                                        key="pending-badge"
                                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                        className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-[#050505] shadow-lg z-10"
                                                    >
                                                        <Clock className="w-2.5 h-2.5 text-white" />
                                                    </motion.div>
                                                ) : null}
                                            </AnimatePresence>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-sm text-white tracking-tight">{req.token_symbol}</p>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">
                                                {req.note || 'No description node'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right space-y-1">
                                        <p className="font-black text-sm text-white tabular-nums">
                                            {req.amount.toLocaleString()} {req.token_symbol}
                                        </p>
                                        <p className="text-[10px] font-bold text-primary">
                                            ≈ {formatFiat(req.amount * livePrice)}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                            <div className="w-16 h-16 rounded-[2rem] bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
                                <HandCoins className="w-8 h-8 text-white" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-widest text-white">Registry Empty</p>
                                <p className="text-[9px] font-medium leading-relaxed max-w-[180px]">
                                    No P2P requests detected in this epoch.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Sheet open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                <SheetContent side="bottom" className="bg-[#0a0a0c] border-t border-primary/20 rounded-t-[3.5rem] p-6 h-auto overflow-hidden">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Request Details</SheetTitle>
                        <SheetDescription>View and share your payment request node.</SheetDescription>
                    </SheetHeader>
                    <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 shrink-0" />
                    
                    {selectedRequest && (() => {
                        const asset = getAssetForRequest(selectedRequest);
                        const priceId = (asset?.priceId || asset?.coingeckoId || asset?.address || '').toLowerCase();
                        const livePrice = prices[priceId]?.price || asset?.priceUsd || 0;
                        const shareUrl = `${window.location.origin}/request/${selectedRequest.id}`;
                        const isPaid = selectedRequest.status === 'paid';

                        return (
                            <div className="flex flex-col items-center space-y-6 pb-10">
                                <div className="text-center space-y-1">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 border",
                                        isPaid ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-primary/10 border-primary/20 text-primary"
                                    )}>
                                        {isPaid ? <CheckCircle2 className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                                    </div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                                        {isPaid ? 'Handshake Fulfilled' : 'Active Request Node'}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">
                                        {selectedRequest.token_symbol} • {allChainsMap[asset?.chainId || 1]?.name}
                                    </p>
                                </div>

                                <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl relative group">
                                    <QRCode value={shareUrl} size={160} level="H" />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="p-1.5 bg-white rounded-lg shadow-xl border border-zinc-100">
                                            <TokenLogoDynamic logoUrl={asset?.iconUrl} alt="Token" size={28} symbol={selectedRequest.token_symbol} name={asset?.name || selectedRequest.token_symbol} />
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full space-y-3">
                                    <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-0.5">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Amount Requested</p>
                                        <h3 className="text-2xl font-black text-white">
                                            {selectedRequest.amount.toLocaleString()} {selectedRequest.token_symbol}
                                        </h3>
                                        <p className="text-[10px] font-bold text-primary">≈ {formatFiat(selectedRequest.amount * livePrice)}</p>
                                    </div>

                                    {!isPaid && (
                                        <div className="space-y-2">
                                            <button 
                                                onClick={() => handleCopy(shareUrl)} 
                                                className={cn(
                                                    "w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all", 
                                                    isCopied ? "bg-green-500/10 border-green-500/30" : "bg-white/5 border-white/10"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isCopied ? "bg-green-500/20 text-green-500" : "bg-primary/20 text-primary")}>
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </div>
                                                    <p className="text-[9px] text-white/60 truncate font-mono">{shareUrl}</p>
                                                </div>
                                                <span className="text-[9px] font-black uppercase text-primary shrink-0">{isCopied ? "Copied" : "Copy"}</span>
                                            </button>
                                            <Button 
                                                onClick={() => navigator.share({ title: 'Payment Request', url: shareUrl })} 
                                                className="w-full h-14 rounded-2xl gap-3 font-black text-sm uppercase bg-primary shadow-xl shadow-primary/20"
                                            >
                                                <Share2 className="w-4 h-4" /> Share Link
                                            </Button>
                                        </div>
                                    )}

                                    {isPaid && (
                                        <div className="p-4 rounded-[2rem] bg-green-500/10 border border-green-500/20 flex gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                            <div className="text-left">
                                                <p className="text-[10px] font-black text-green-500 uppercase">Registry Status: SETTLED</p>
                                                <p className="text-[9px] text-green-400 opacity-80 leading-relaxed">
                                                    Funds have been verified and cleared in the SmarterSeller ledger.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-center gap-2 opacity-20 pt-2">
                                    <ShieldCheck className="w-3 h-3" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Protocol Handshake v3.1 Verified</span>
                                </div>
                            </div>
                        );
                    })()}
                </SheetContent>
            </Sheet>
        </div>
    );
}
