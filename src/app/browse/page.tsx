'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  Globe, 
  LayoutGrid, 
  Sparkles, 
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Zap,
  Building2,
  Filter,
  ShoppingCart,
  Loader2,
  ImageIcon,
  ChevronDown,
  Activity,
  ArrowUpRight,
  Crown,
  Repeat,
  Users,
  Compass,
  Monitor,
  Flame,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { nftService } from '@/lib/services/nft-service';
import type { NFTItem, MarketplaceAd, WhaleActivity } from '@/lib/types';
import CachedImage from '@/components/CachedImage';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * INSTITUTIONAL DISCOVERY ECOSYSTEM (V9.0 - HIGH DENSITY)
 * Version: 9.0.0 (Tall-Node Handshake Standard)
 */
export default function BrowsePage() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [data, setData] = useState<{ nfts: NFTItem[], ads: MarketplaceAd[], activity: WhaleActivity[] }>({ nfts: [], ads: [], activity: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [selectedChainId, setSelectedChainId] = useState(1);

    const networks = [
        { id: 1, name: 'Ethereum', icon: '💎' },
        { id: 137, name: 'Polygon', icon: '🟣' }
    ];

    // 20+ Tall Box Explorers
    const explorers = useMemo(() => Array.from({ length: 22 }).map((_, i) => ({
        id: i,
        name: ['velvet', 'storm', 'cyber', 'nexus', 'alpha', 'delta', 'omega', 'echo', 'sigma', 'titan'][i % 10] + `_${i + 100}`,
        avatar: `https://picsum.photos/seed/explorer${i}/200/300`
    })), []);

    // Top Scrolling Ads
    const projectAds = [
        { title: "Protocol X", desc: "Native Yield", img: "https://picsum.photos/seed/p1/400/200", hint: "bitcoin blockchain" },
        { title: "Hyper Node", desc: "Zero Fee Swap", img: "https://picsum.photos/seed/p2/400/200", hint: "crypto mining" },
        { title: "Luna Settle", desc: "P2P Escrow", img: "https://picsum.photos/seed/p3/400/200", hint: "ethereum abstract" },
        { title: "Vault Pro", desc: "Elite Status", img: "https://picsum.photos/seed/p4/400/200", hint: "digital currency" }
    ];

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            const unified = await nftService.fetchMarketplaceUnified(selectedChainId);
            setData(unified);
            setIsLoading(false);
        }
        load();
    }, [selectedChainId]);

    const activeNetwork = networks.find(n => n.id === selectedChainId);

    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-foreground overflow-hidden">
            <header className="p-3 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50 px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-lg h-8 w-8">
                    <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </Button>
                <div className="flex flex-col items-center text-center">
                    <h1 className="text-[10px] font-black uppercase tracking-[0.2em] leading-none text-white/90">Ecosystem Hub</h1>
                    <div className="flex items-center gap-1 mt-1">
                        <Compass className="w-2 h-2 text-primary" />
                        <span className="text-[7px] text-primary font-black uppercase tracking-tighter">Discovery Active</span>
                    </div>
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-7 px-2 rounded-lg bg-white/5 gap-1.5 border border-white/10 hover:bg-white/10 transition-all">
                            <span className="text-[9px] font-black uppercase">{activeNetwork?.name}</span>
                            <ChevronDown className="w-2.5 h-2.5 opacity-40" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0a0a0c] border-white/10 rounded-xl p-1 w-32">
                        {networks.map(net => (
                            <DropdownMenuItem 
                                key={net.id} 
                                onClick={() => setSelectedChainId(net.id)}
                                className={cn(
                                    "rounded-lg gap-2 px-2 py-1.5 cursor-pointer",
                                    selectedChainId === net.id ? "bg-primary/10 text-primary" : "text-white/60"
                                )}
                            >
                                <span className="text-xs">{net.icon}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest">{net.name}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            <main className="flex-1 overflow-y-auto thin-scrollbar pb-32">
                <div className="p-5 space-y-8 max-w-lg mx-auto w-full">
                    
                    {/* 🔍 SEARCH NODE (SHARP) */}
                    <div className="relative group">
                        <div className="relative bg-[#0a0a0c] border border-white/10 rounded-xl p-1">
                            <div className="flex items-center gap-2 px-3">
                                <Search className="w-4 h-4 text-zinc-600" />
                                <Input 
                                    placeholder="Search collections or nodes..." 
                                    className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-zinc-700 h-10 text-xs"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 🎬 CINEMATIC TOP AD CAROUSEL (SHARP) */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-1.5 px-1">
                            <Target className="w-3.5 h-3.5 text-primary" />
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Featured project nodes</h3>
                        </div>
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex gap-3 pb-2">
                                {projectAds.map((ad, i) => (
                                    <div key={i} className="relative w-[280px] h-[130px] rounded-xl overflow-hidden shrink-0 group shadow-xl">
                                        <CachedImage 
                                            src={ad.img} 
                                            alt={ad.title} 
                                            fill 
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            data-ai-hint={ad.hint}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <p className="text-[14px] font-black text-white uppercase tracking-tight leading-none">{ad.title}</p>
                                            <p className="text-[8px] font-bold text-primary uppercase tracking-widest mt-1">{ad.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" className="h-1" />
                        </ScrollArea>
                    </section>

                    {/* 🕵️ ECOSYSTEM EXPLORERS (TALL BOX NODES) */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-primary" />
                                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Network Finders</h3>
                            </div>
                            <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Active nodes: {explorers.length}</span>
                        </div>
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex gap-3 pb-4">
                                {explorers.map((ex, i) => (
                                    <div key={i} className="flex flex-col w-20 h-28 bg-[#0a0a0c] border border-white/5 rounded-xl overflow-hidden shadow-lg group active:scale-95 transition-all">
                                        <div className="flex-1 relative">
                                            <CachedImage 
                                                src={ex.avatar} 
                                                alt={ex.name} 
                                                fill 
                                                className="object-cover group-hover:scale-110 transition-transform duration-500" 
                                                data-ai-hint="portrait profile"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-40" />
                                        </div>
                                        <div className="p-2 bg-black/40 text-center border-t border-white/5">
                                            <p className="text-[8px] font-black uppercase text-white/80 truncate tracking-tighter">@{ex.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" className="h-1" />
                        </ScrollArea>
                    </section>

                    {/* 🔥 TRENDING NODES (SHARP & COMPACT) */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Trending Nodes</h3>
                            </div>
                            <button className="text-[8px] font-black text-primary uppercase tracking-widest">View All</button>
                        </div>
                        
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex gap-3 pb-3">
                                {isLoading ? Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="w-[120px] h-[150px] rounded-xl bg-white/5 animate-pulse" />
                                )) : data.nfts.map((nft) => (
                                    <motion.div 
                                        key={nft.id}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => router.push(`/browse/nft/${nft.id}`)}
                                        className="inline-block w-[120px] bg-[#0a0a0c] border border-white/5 rounded-xl overflow-hidden cursor-pointer group shadow-lg"
                                    >
                                        <div className="relative aspect-square">
                                            <CachedImage src={nft.imageUrl} alt={nft.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="p-3 space-y-0.5">
                                            <div className="flex items-center gap-1">
                                                <p className="text-[9px] font-black text-white uppercase truncate">{nft.collectionName}</p>
                                                <ShieldCheck className="w-2.5 h-2.5 text-blue-400" />
                                            </div>
                                            <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest">Floor: {nft.price || 32.7} ETH</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </ScrollArea>
                    </section>

                    {/* 🛒 LIVE CRYPTO ADS (SLIM) */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-1.5">
                                <ShoppingCart className="w-3.5 h-3.5 text-primary" />
                                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Live Crypto Ads</h3>
                            </div>
                            <button className="text-[8px] font-black text-primary uppercase tracking-widest">Post Ad</button>
                        </div>

                        <div className="space-y-1.5">
                            {isLoading ? Array(4).fill(0).map((_, i) => (
                                <div key={i} className="w-full h-14 rounded-xl bg-white/5 animate-pulse" />
                            )) : data.ads.map((ad) => (
                                <div key={ad.id} className="p-3 rounded-xl bg-[#0a0a0c] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-black border border-white/10 flex items-center justify-center shadow-inner">
                                            <TokenLogoDynamic symbol={ad.token} name={ad.token} logoUrl={null} size={24} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black text-white uppercase tracking-tight">Buy {ad.token}</p>
                                            <p className="text-[7px] text-white/20 font-bold uppercase tracking-widest leading-none">Via {ad.network}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-[11px] font-black text-green-400 leading-none">{ad.price}</p>
                                            <p className="text-[7px] font-black text-white/20 uppercase tracking-widest mt-0.5">{ad.fee}</p>
                                        </div>
                                        <Button size="sm" className="h-7 px-3 rounded-lg bg-green-500/10 text-green-500 border border-green-500/20 font-black uppercase text-[7px] tracking-widest hover:bg-green-500 hover:text-black">Buy</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 📊 WHALE ACTIVITY (SLIM) */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-1.5 px-1">
                            <Activity className="w-3.5 h-3.5 text-blue-400" />
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Whale Activity</h3>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3 shadow-lg">
                            {data.activity.map((w, i) => (
                                <div key={w.id} className="flex items-start gap-3 relative">
                                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                                        {w.type === 'buy' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="flex-1 space-y-0.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[8px] font-black text-white uppercase tracking-widest">{w.user}</span>
                                            <span className="text-[6px] font-bold text-white/20 uppercase">{w.timestamp}</span>
                                        </div>
                                        <p className="text-[10px] text-white/60 font-medium leading-tight">“{w.message}”</p>
                                    </div>
                                    {i < data.activity.length - 1 && <div className="h-px bg-white/5 absolute -bottom-1.5 left-10 right-0" />}
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="pt-6 text-center opacity-20">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span className="text-[7px] font-black uppercase tracking-widest text-white">Handshake Secured v9.0</span>
                        </div>
                        <p className="text-[6px] font-medium leading-relaxed max-w-[180px] mx-auto uppercase tracking-tighter">Verified data resolved via institutional discovery nodes.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
