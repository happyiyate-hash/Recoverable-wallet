
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Loader2, 
  Trash2, 
  ExternalLink,
  ShieldCheck,
  Tag,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { EscrowListing } from '@/lib/services/escrow-service';
import { useToast } from '@/hooks/use-toast';

/**
 * INSTITUTIONAL MARKETPLACE REGISTRY (ADMIN)
 * Version: 2.0.0 (Escrow Listings Standard)
 * 
 * Directly monitors the escrow_listings table for ecosystem auditing.
 */
export default function AdminProductsPage() {
  const [listings, setListings] = useState<EscrowListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchListings = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('escrow_listings')
        .select(`
          *,
          seller:profiles!seller_id(name, email, photo_url, average_rating, review_count, tier)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data as any[]);
    } catch (e: any) {
      console.error("[REGISTRY_SCAN_FAIL]", e);
      toast({ variant: 'destructive', title: 'Registry Link Fail', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchListings();
    
    // REAL-TIME SENTINEL: Watch for new market nodes
    const channel = supabase?.channel('market-registry-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escrow_listings' }, () => fetchListings())
      .subscribe();

    return () => { supabase?.removeChannel(channel!); };
  }, [fetchListings]);

  const handleCloseListing = async (id: string) => {
    try {
      const { error } = await supabase!
        .from('escrow_listings')
        .update({ status: 'closed' })
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Node De-listed", description: "Offer removed from public registry." });
      fetchListings();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Action Denied', description: e.message });
    }
  };

  const filtered = listings.filter(l => 
    l.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.seller?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.asset?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-10 overflow-y-auto thin-scrollbar h-full">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-primary" />
            Market Registry
          </h1>
          <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em] mt-1">Ecosystem Offer Matrix</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
            <Input 
              placeholder="Search Listings..." 
              className="bg-white/5 border-white/10 rounded-xl pl-11 h-12 text-xs focus-visible:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 h-12 w-12 p-0">
            <Filter className="w-4 h-4 text-white/40" />
          </Button>
        </div>
      </header>

      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Market Node</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Seller Identity</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4 text-center">Protocol</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4 text-center">Asking Price</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4">Status</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest text-white/40 px-6 py-4 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-white/5">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-24">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary opacity-40" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-4">Auditing Marketplace Nodes...</p>
                </TableCell>
              </TableRow>
            ) : filtered.length > 0 ? (
              filtered.map((listing) => (
                <TableRow key={listing.id} className="border-white/5 hover:bg-white/[0.01] transition-colors group">
                  <TableCell className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary/60">
                        {listing.type === 'crypto' ? <Tag className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-black text-sm text-white uppercase tracking-tight truncate max-w-[200px]">
                          {listing.type === 'crypto' ? `${listing.amount} ${listing.asset}` : listing.description}
                        </p>
                        <p className="text-[8px] font-mono text-white/20 uppercase tracking-widest mt-0.5">UID: {listing.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-lg border border-white/10">
                        <AvatarImage src={listing.seller?.photo_url} />
                        <AvatarFallback className="bg-primary/20 text-primary font-black text-[10px]">{listing.seller?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-[11px] font-black text-white/80 uppercase">@{listing.seller?.name}</p>
                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">{listing.seller?.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-center">
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest rounded-md bg-white/5 border-white/10">
                      {listing.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-center">
                    <span className="text-sm font-black text-white tabular-nums">
                      {listing.price_wnc?.toLocaleString()} <span className="text-[10px] text-primary">WNC</span>
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-5">
                    <Badge variant="outline" className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md",
                      listing.status === 'open' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-white/5 border-white/10 text-white/40"
                    )}>
                      {listing.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleCloseListing(listing.id)}
                      disabled={listing.status === 'closed'}
                      className="rounded-xl text-red-500/40 hover:text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-32 opacity-20">
                  <ShoppingBag className="mx-auto h-12 w-12 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Market Feed Empty</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
