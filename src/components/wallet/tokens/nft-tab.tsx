
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { nftService } from '@/lib/services/nft-service';
import type { NFTItem } from '@/lib/types';
import { 
  LayoutGrid, 
  Loader2, 
  Info, 
  X, 
  ExternalLink,
  ShieldCheck,
  ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import CachedImage from '@/components/CachedImage';
import { useWallet } from '@/contexts/wallet-provider';

export default function NftTab() {
  const { wallets, viewingNetwork } = useWallet();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNft, setSelectedNft] = useState<NFTItem | null>(null);

  useEffect(() => {
    async function load() {
      if (!wallets?.[0]) return;
      const data = await nftService.fetchUserNFTs(wallets[0].address, viewingNetwork.chainId);
      setNfts(data);
      setLoading(false);
    }
    load();
  }, [wallets, viewingNetwork.chainId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest">Scanning Digital Registry...</p>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="py-32 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
        <div className="w-16 h-16 rounded-[2rem] bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-white" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-white">Registry Empty</p>
          <p className="text-[9px] font-medium leading-relaxed max-w-[180px]">
            No collectibles detected on the {viewingNetwork.name} node.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">Asset Grid</span>
        </div>
        <span className="text-[8px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full">
          {nfts.length} Items Found
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {nfts.map((nft, i) => (
          <motion.div 
            key={nft.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedNft(nft)}
            className="group relative aspect-square rounded-[2rem] overflow-hidden bg-white/[0.02] border border-white/5 cursor-pointer active:scale-95 transition-all shadow-2xl"
          >
            <CachedImage 
              src={nft.imageUrl} 
              alt={nft.name} 
              fill 
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-[10px] font-black text-white uppercase truncate drop-shadow-lg">{nft.name}</p>
              <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest truncate">{nft.collectionName}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <Sheet open={!!selectedNft} onOpenChange={(o) => !o && setSelectedNft(null)}>
        <SheetContent side="bottom" className="bg-[#0a0a0c] border-t border-primary/20 rounded-t-[3.5rem] p-8 h-auto overflow-hidden shadow-2xl">
          <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-8 shrink-0" />
          
          {selectedNft && (
            <div className="space-y-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative w-40 h-40 rounded-[2.5rem] overflow-hidden border-2 border-primary/20 shadow-2xl">
                  <CachedImage src={selectedNft.imageUrl} alt={selectedNft.name} fill className="object-cover" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white">{selectedNft.name}</h2>
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest">{selectedNft.collectionName} Registry</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Metadata Analysis</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{selectedNft.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <p className="text-[8px] font-black text-white/20 uppercase">Token ID</p>
                    <p className="text-xs font-mono font-bold text-white">#{selectedNft.tokenId}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                    <p className="text-[8px] font-black text-white/20 uppercase">Standard</p>
                    <p className="text-xs font-black text-white uppercase tracking-tighter">ERC-721 Node</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                  Transfer Node
                </Button>
                <Button variant="outline" className="w-14 h-14 rounded-2xl bg-white/5 border-white/10">
                  <ExternalLink className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 opacity-20">
                <ShieldCheck className="w-3 h-3 text-white" />
                <span className="text-[8px] font-black uppercase tracking-widest text-white">Digital Registry Authenticated</span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
