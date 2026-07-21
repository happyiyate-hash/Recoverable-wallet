'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ShieldCheck, 
  History, 
  ExternalLink, 
  Loader2, 
  Send,
  Zap,
  Info,
  CheckCircle2,
  ChevronDown,
  Star,
  Activity,
  MoreVertical,
  Plus,
  ArrowRight,
  ShoppingCart,
  ChevronRight,
  Tag,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { nftService } from '@/lib/services/nft-service';
import type { NFTItem } from '@/lib/types';
import CachedImage from '@/components/CachedImage';
import { cn } from '@/lib/utils';
import { useWallet } from '@/contexts/wallet-provider';
import { useToast } from '@/hooks/use-toast';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * INSTITUTIONAL ASSET DETAIL (COMPACT EDITION)
 * Version: 9.0.0 (Sharpened Handshake Protocol)
 */
export default function AssetDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { allAssets } = useWallet();

    const [nft, setNft] = useState<NFTItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Trading Form State
    const [adMode, setAdMode] = useState<'buying' | 'selling'>('buying');
    const [selectedCrypto, setSelectedCrypto] = useState('USDT');
    const [amount, setAmount] = useState('100');
    const [pricePerUnit, setPricePerUnit] = useState('1.00');

    const offers = [
        { price: '31.20 ETH', user: 'velvet_node', time: '2m ago' },
        { price: '31.00 ETH', user: 'nexus_authority', time: '5m ago' },
        { price: '30.50 ETH', user: 'alpha_op', time: '10m ago' },
    ];

    useEffect(() => {
        async function load() {
            const id = params.id as string;
            if (!id) return;
            const [chainIdStr, contract, tokenId] = id.split('-');
            const chainId = parseInt(chainIdStr || '1');
            const data = await nftService.getNFTDetails(contract, tokenId, chainId);
            setNft(data);
            setIsLoading(false);
        }
        load();
    }, [params.id]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-[#050505] gap-4">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Synchronizing Metadata Node...</p>
            </div>
        );
    }

    if (!nft) return null;

    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-foreground">
            {/* 🏛️ HEADER NODE */}
            <header className="p-3 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-lg h-8 w-8">
                    <ArrowLeft className="w-4 h-4 text-white/60" />
                </Button>
                <div className="flex flex-col items-center">
                    <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90 leading-none">Asset Node</h1>
                    <div className="flex items-center gap-1 mt-1">
                        <ShieldCheck className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[8px] text-primary font-black uppercase tracking-tighter">Verified Registry</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8"><MoreVertical className="w-4 h-4 text-muted-foreground" /></Button>
            </header>

            <main className="flex-1 p-5 space-y-6 max-w-lg mx-auto w-full pb-32 overflow-y-auto thin-scrollbar">
                
                {/* 🎨 SHARP ASSET CARD */}
                <section className="space-y-4">
                    <div className="flex gap-5 items-start">
                        <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-white/10 shadow-xl shrink-0">
                            <CachedImage src={nft.imageUrl} alt={nft.name} fill className="object-cover" />
                        </div>

                        <div className="flex-1 space-y-3 pt-1">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                    <h2 className="text-lg font-black uppercase tracking-tight text-white">{nft.collectionName}</h2>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Zap className="w-2.5 h-2.5 text-primary fill-primary" />
                                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">UID: #{nft.tokenId?.slice(0, 4)}</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <DetailRow label="Owned by" value="0x8f...a3d2" link />
                                <DetailRow label="Floor" value="32.70 ETH" />
                                <DetailRow label="Best" value="31.20 ETH" />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <ActionButton icon={<Send className="w-3.5 h-3.5" />} label="Share" />
                        <ActionButton icon={<Star className="w-3.5 h-3.5" />} label="Watch" />
                        <Button className="flex-[1.5] h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[8px] tracking-widest shadow-lg gap-1.5">
                            <ExternalLink className="w-3.5 h-3.5" /> OpenSea
                        </Button>
                    </div>
                </section>

                {/* 📊 COMPACT OFFERS REGISTRY */}
                <section className="space-y-3">
                    <div className="flex items-center gap-1.5 px-1">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40">Market Pulse</h3>
                    </div>
                    <div className="bg-[#0a0a0c] border border-white/5 rounded-xl overflow-hidden shadow-xl">
                        <div className="divide-y divide-white/5">
                            {offers.map((offer, i) => (
                                <div key={i} className="p-3 px-5 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-center gap-6">
                                        <p className="text-xs font-black text-white tabular-nums">{offer.price}</p>
                                        <p className="text-[9px] font-black text-green-500/60 uppercase tracking-widest">@{offer.user}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-[8px] font-bold text-white/20 uppercase">{offer.time}</p>
                                        <Button size="sm" className="h-6 px-3 rounded-lg bg-green-500/10 text-green-500 border border-green-500/20 font-black uppercase text-[7px] tracking-widest hover:bg-green-500 hover:text-black">Buy</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 🛒 POST A CRYPTO AD (SHARP TERMINAL) */}
                <section className="space-y-4 pt-2">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40">Ecosystem Trade</h3>
                        <button className="text-[7px] font-black text-primary uppercase tracking-widest">All Ads <ChevronRight className="inline w-2.5 h-2.5" /></button>
                    </div>

                    <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl rounded-full -mr-12 -mt-12" />
                        
                        {/* Token Selector Hub */}
                        <div className="flex justify-between items-center px-1">
                            {['USDT', 'BTC', 'ETH', 'SOL'].map(t => (
                                <button key={t} onClick={() => setSelectedCrypto(t)} className={cn("flex flex-col items-center gap-2 transition-all active:scale-90", selectedCrypto === t ? "opacity-100" : "opacity-20")}>
                                    <div className="w-9 h-9 rounded-full bg-black border border-white/10 flex items-center justify-center shadow-lg">
                                        <TokenLogoDynamic symbol={t} name={t} logoUrl={null} size={22} />
                                    </div>
                                    <span className="text-[8px] font-black uppercase text-white tracking-widest">{t}</span>
                                </button>
                            ))}
                            <button className="flex flex-col items-center gap-2 opacity-20">
                                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
                                    <Plus className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-[8px] font-black uppercase text-white tracking-widest">More</span>
                            </button>
                        </div>

                        <div className="flex p-0.5 bg-white/5 rounded-xl border border-white/10">
                            <button onClick={() => setAdMode('buying')} className={cn("flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all", adMode === 'buying' ? "bg-white/10 text-white shadow-lg" : "text-white/20")}>Buying</button>
                            <button onClick={() => setAdMode('selling')} className={cn("flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all", adMode === 'selling' ? "bg-white/10 text-white shadow-lg" : "text-white/20")}>Selling</button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[8px] font-black uppercase tracking-widest text-white/30 px-1">Target</Label>
                                <div className="h-10 bg-white/[0.03] border border-white/10 rounded-xl px-4 flex items-center justify-between text-[11px] font-bold text-white">
                                    <span>{selectedCrypto}</span>
                                    <ChevronDown className="w-3 h-3 opacity-30" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[8px] font-black uppercase tracking-widest text-white/30 px-1">Amount</Label>
                                <div className="relative">
                                    <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 bg-white/[0.03] border-white/10 rounded-xl px-4 text-xs font-black text-white focus-visible:ring-primary shadow-inner" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[8px] font-black uppercase tracking-widest text-white/30 px-1">Settlement Method</Label>
                            <div className="h-12 bg-white/[0.03] border border-white/10 rounded-xl px-4 flex items-center justify-between text-[11px] font-bold text-white group cursor-pointer hover:bg-white/5 transition-all">
                                <div className="flex items-center gap-3">
                                    <TokenLogoDynamic symbol="ETH" name="Ethereum" logoUrl={null} size={20} />
                                    <span>Ethereum Node</span>
                                </div>
                                <ChevronDown className="w-4 h-4 opacity-30" />
                            </div>
                        </div>

                        <Button className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-[0.98] border-b-4 border-primary/50">
                            Broadcast Ad
                        </Button>
                    </div>
                </section>

                <div className="pt-6 flex flex-col items-center gap-2 opacity-20 pb-10">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                        <ShieldCheck className="w-3 h-3 text-primary" strokeWidth={3} />
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Handshake Protocol Secured</span>
                    </div>
                </div>
            </main>
        </div>
    );
}

function DetailRow({ label, value, link }: { label: string, value: string, link?: boolean }) {
    return (
        <div className="flex items-center justify-between group">
            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{label}</span>
            <span className={cn("text-[10px] font-black uppercase tracking-tight", link ? "text-blue-400" : "text-white")}>{value}</span>
        </div>
    );
}

function ActionButton({ icon, label }: { icon: React.ReactNode, label: string }) {
    return (
        <button className="flex-1 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white transition-all">
            {icon}
            {label}
        </button>
    );
}
