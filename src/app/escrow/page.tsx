'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Plus, 
  Loader2, 
  Search, 
  CheckCircle2, 
  ChevronRight,
  ShoppingCart,
  Zap,
  Tag,
  Briefcase,
  Star,
  Activity,
  Lock,
  Clock,
  ShieldOff,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUser } from '@/contexts/user-provider';
import { escrowService, type EscrowTrade, type EscrowRequest } from '@/lib/services/escrow-service';
import type { EscrowListing } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import ReviewBottomSheet from '@/components/escrow/review-bottom-sheet';
import { supabase } from '@/lib/supabase/client';

/**
 * INSTITUTIONAL ESCROW HUB (MARKETPLACE + REGISTRY)
 * Version: 36.0.0 (Registry Visibility Patch)
 */
export default function EscrowDashboard() {
  const router = useRouter();
  const { user, profile } = useUser();
  const { toast } = useToast();
  
  const [listings, setListings] = useState<EscrowListing[]>([]);
  const [trades, setTrades] = useState<EscrowTrade[]>([]);
  const [requests, setRequests] = useState<EscrowRequest[]>([]);
  const [myOwnListings, setMyOwnListings] = useState<EscrowListing[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('marketplace');
  const [myTradesSubTab, setMyTradesSubTab] = useState('buying');

  // Review Sheet States
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedReviewUser, setSelectedReviewUser] = useState<{ id: string, name: string } | null>(null);

  /**
   * UNIFIED REGISTRY LOAD
   */
  const loadAll = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const data = await escrowService.fetchEscrowDashboard(user.id);
      
      setListings(data.marketplace || []);
      setMyOwnListings(data.my_listings || []);
      setRequests(data.requests || []);
      setTrades(data.trades || []);
    } catch (e: any) {
      console.error("[REGISTRY_SYNC_FAIL]", e.message);
      toast({ variant: "destructive", title: "Sync Error", description: "Identity registry handshake deferred." });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { 
    loadAll();

    if (!supabase || !user) return;

    // ⚡ REAL-TIME SENTINEL
    const channel = supabase.channel('escrow-global-sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'escrow_listings' 
      }, () => loadAll(true))
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'escrow_trades'
      }, () => loadAll(true))
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'escrow_requests'
      }, () => loadAll(true))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadAll, user]);

  const stats = useMemo(() => {
    const myActiveTrades = trades.filter(t => t.status !== 'COMPLETED' && t.status !== 'DISPUTED');
    const myActiveRequests = requests.filter(r => r.status === 'pending');
    return {
      listings: myOwnListings.length,
      trades: myActiveTrades.length,
      requests: myActiveRequests.length
    };
  }, [myOwnListings, trades, requests]);

  const filteredMarketplace = useMemo(() => {
    const term = search.toLowerCase();
    return listings.filter(l => 
      (
        (l.description || '').toLowerCase().includes(term) ||
        (l.seller?.name || '').toLowerCase().includes(term) ||
        (l.asset || '').toLowerCase().includes(term)
      )
    );
  }, [listings, search]);

  const displayTrades = useMemo(() => {
    const activeTradeRequestIds = new Set(trades.map(t => t.request_id).filter(Boolean));

    if (myTradesSubTab === 'buying') {
      const t = trades.filter(t => t.buyer_id === user?.id);
      const r = requests.filter(r => r.requester_id === user?.id && !activeTradeRequestIds.has(r.id));
      return { trades: t, requests: r };
    } else if (myTradesSubTab === 'selling') {
      const t = trades.filter(t => t.seller_id === user?.id);
      const r = requests.filter(r => r.receiver_id === user?.id && !activeTradeRequestIds.has(r.id));
      return { trades: t, requests: r };
    }
    return { trades: [], requests: [] };
  }, [trades, requests, myTradesSubTab, user?.id]);

  const handleJoinListing = async (listing: EscrowListing) => {
    if (!user || joiningId) return;
    
    setJoiningId(listing.id);
    try {
      const result = await escrowService.joinListing(listing, user.id);
      const isExisting = (result as any)?.alreadyExists;
      
      toast({ 
        title: isExisting ? "Active Node Found" : "Handshake Broadcasted", 
        description: isExisting 
          ? "You already have an active request for this node." 
          : "Check 'My Registry' for your pending handshake." 
      });
      
      setActiveTab('trades');
      setMyTradesSubTab('buying');
      loadAll(true); 
    } catch (e: any) {
      toast({ variant: "destructive", title: "Action Denied", description: e.message });
    } finally {
      setJoiningId(null);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!user) return;
    try {
      const tradeId = await escrowService.acceptRequest(requestId, user.id);
      toast({ title: "Request Accepted", description: "Atomic trade node generated." });
      router.push(`/escrow/${tradeId}`);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Handshake Failed", description: e.message });
    }
  };

  const handleOpenReviews = (id: string, name: string) => {
    setSelectedReviewUser({ id, name });
    setIsReviewOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-foreground relative">
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-50 px-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white/90">Trust Protocol</h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <ShieldCheck className="w-2.5 h-2.5 text-primary" />
            <span className="text-[8px] text-primary font-black uppercase tracking-tighter">Marketplace Hub</span>
          </div>
        </div>
        <button onClick={() => loadAll()} className={cn("p-2 rounded-xl hover:bg-white/5 text-white/20 transition-all", loading && "animate-spin text-primary")}>
            <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full pb-32 overflow-y-auto thin-scrollbar">
        
        <section className="grid grid-cols-2 gap-3">
          <div className="p-6 rounded-[2.5rem] bg-[#0a0a0c] border border-white/5 space-y-1 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 blur-2xl -mr-8 -mt-8" />
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Registry Nodes</p>
            <p className="text-2xl font-black text-white tabular-nums">{stats.trades + stats.requests}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Activity className="w-2.5 h-2.5 text-primary" />
              <span className="text-[7px] font-black text-primary uppercase">Handshake Pulse</span>
            </div>
          </div>
          <div className="p-6 rounded-[2.5rem] bg-[#0a0a0c] border border-white/5 space-y-1 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 blur-2xl -mr-8 -mt-8" />
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Your Listings</p>
            <p className="text-2xl font-black text-white tabular-nums">{stats.listings}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Tag className="w-2.5 h-2.5 text-green-500" />
              <span className="text-[7px] font-black text-green-500 uppercase">Market Discovery</span>
            </div>
          </div>
        </section>

        <section className="px-2">
          <Button 
            onClick={() => router.push('/escrow/create')}
            className="w-full h-16 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl gap-3 transition-all active:scale-[0.98] bg-primary hover:bg-primary/90 text-white shadow-primary/20"
          >
            <Plus className="w-5 h-5" /> Establish New Node
          </Button>
        </section>

        <div className="relative group">
          <div className="absolute -inset-1 bg-primary/10 rounded-2xl blur opacity-25 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative bg-white/[0.03] border border-white/10 rounded-2xl p-1">
            <div className="flex items-center gap-3 px-4">
              <Search className="w-4 h-4 text-zinc-600" />
              <Input 
                placeholder="Search marketplace..." 
                className="bg-transparent border-none focus-visible:ring-0 text-sm h-12"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5 rounded-2xl p-1 mb-6 border border-primary/20">
            <TabsTrigger value="marketplace" className="rounded-xl text-[10px] font-black uppercase tracking-widest">Public Feed</TabsTrigger>
            <TabsTrigger value="trades" className="rounded-xl text-[10px] font-black uppercase tracking-widest">My Registry</TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace" className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center py-20 gap-4 opacity-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest">Syncing Feed...</p>
              </div>
            ) : filteredMarketplace.length > 0 ? (
              filteredMarketplace.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing} 
                  onJoin={() => handleJoinListing(listing)} 
                  onReviewOpen={() => handleOpenReviews(listing.seller_id, listing.seller?.name || 'User')}
                  isJoining={joiningId === listing.id}
                />
              ))
            ) : (
              <EmptyState title="Feed Empty" desc="No active marketplace offers detected." icon={ShoppingCart} />
            )}
          </TabsContent>

          <TabsContent value="trades" className="space-y-6">
            <div className="flex items-center justify-center p-1 bg-white/5 rounded-2xl border border-primary/20">
              <button 
                onClick={() => setMyTradesSubTab('buying')}
                className={cn("flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", myTradesSubTab === 'buying' ? "bg-primary text-white shadow-lg" : "text-muted-foreground")}
              >
                Buying
              </button>
              <button 
                onClick={() => setMyTradesSubTab('selling')}
                className={cn("flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", myTradesSubTab === 'selling' ? "bg-primary text-white shadow-lg" : "text-muted-foreground")}
              >
                Selling
              </button>
              <button 
                onClick={() => setMyTradesSubTab('offers')}
                className={cn("flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", myTradesSubTab === 'offers' ? "bg-primary text-white shadow-lg" : "text-muted-foreground")}
              >
                My Offers
              </button>
            </div>

            <div className="space-y-3">
              {myTradesSubTab === 'offers' ? (
                myOwnListings.length > 0 ? myOwnListings.map((listing) => (
                  <ListingCard 
                    key={listing.id} 
                    listing={listing} 
                    onJoin={() => {}} 
                    onReviewOpen={() => handleOpenReviews(listing.seller_id, listing.seller?.name || 'User')}
                    isOwnerView
                  />
                )) : (
                  <EmptyState title="No Offers" desc="You haven't posted any public offers yet." icon={Tag} />
                )
              ) : (
                <>
                  {displayTrades.requests.map((req) => (
                    <RequestCard key={req.id} request={req} isIncoming={myTradesSubTab === 'selling'} onAccept={() => handleAcceptRequest(req.id)} />
                  ))}

                  {displayTrades.trades.length > 0 ? (
                    displayTrades.trades.map((trade) => (
                      <TradeCard key={trade.id} trade={trade} currentUserId={user?.id || ''} />
                    ))
                  ) : displayTrades.requests.length === 0 && (
                    <EmptyState title="Registry Empty" desc={`You have no active ${myTradesSubTab} nodes.`} icon={Briefcase} />
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <section className="pt-8 opacity-20 pb-10">
          <div className="p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <ShieldCheck className="w-5 h-5" />
              <p className="text-[10px] font-black uppercase tracking-widest">Escrow Protection Active</p>
            </div>
            <p className="text-[8px] font-bold text-muted-foreground uppercase leading-relaxed tracking-tighter">
              Terminal data nodes (Completed trades/Rejected requests) are automatically purged from the registry after 14 days to maintain system integrity.
            </p>
          </div>
        </section>
      </main>

      {selectedReviewUser && (
        <ReviewBottomSheet 
          isOpen={isReviewOpen} 
          onOpenChange={setIsReviewOpen} 
          userId={selectedReviewUser.id} 
          userName={selectedReviewUser.name} 
        />
      )}
    </div>
  );
}

function ListingCard({ listing, onJoin, onReviewOpen, isOwnerView, isJoining }: { listing: any, onJoin: () => void, onReviewOpen: () => void, isOwnerView?: boolean, isJoining?: boolean }) {
  const seller = listing.seller;
  const rating = seller?.rating || 0;
  const rating_count = seller?.rating_count || 0;
  const photo = seller?.photo_url || seller?.avatar_url || '';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("p-5 rounded-[2.5rem] bg-[#0a0a0c] border border-white/5 hover:bg-white/[0.04] transition-all shadow-xl relative overflow-hidden")}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Avatar className="w-10 h-10 rounded-xl border border-white/10 bg-black">
            <AvatarImage src={photo} className="object-cover" />
            <AvatarFallback className="bg-primary/20 text-primary font-black text-xs">{(seller?.name || 'U')[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-black text-white uppercase tracking-tight">@{seller?.name || 'User'}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onReviewOpen(); }} className="flex items-center gap-1 hover:brightness-125 transition-all">
              <Star className={cn("w-2.5 h-2.5 fill-current", rating > 0 ? "text-primary" : "text-white/20")} />
              <span className="text-[7px] font-black uppercase text-white/40">
                {rating > 0 ? `${rating.toFixed(1)} (${rating_count})` : 'New Node'}
              </span>
            </button>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-primary tabular-nums">{listing.price_wnc?.toLocaleString()} WNC</p>
          <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Asking Price</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 shrink-0">
            {listing.type === 'crypto' ? <Tag className="w-5 h-5 text-primary" /> : <Briefcase className="w-5 h-5 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white uppercase tracking-tight truncate">
              {listing.type === 'crypto' ? `Sell: ${listing.amount} ${listing.asset}` : listing.description}
            </p>
            <p className="text-[9px] text-muted-foreground line-clamp-1 font-medium mt-0.5">
              {isOwnerView ? 'Your Public Offer' : 'Verified Public Offer'}
            </p>
          </div>
        </div>

        {!isOwnerView && (
          <button 
            onClick={onJoin} 
            disabled={isJoining}
            className={cn(
              "w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center gap-2"
            )}
          >
            {isJoining ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
            ) : (
              <>Join Trade <ArrowRight className="w-3.5 h-3.5" /></>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function RequestCard({ request, isIncoming, onAccept }: { request: any, isIncoming: boolean, onAccept: () => void }) {
  const peer = isIncoming ? request.requester : request.receiver;
  const photo = peer?.photo_url || peer?.avatar_url || '';

  return (
    <div className="p-5 rounded-[2.5rem] bg-primary/5 border border-primary/20 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-primary/20 flex items-center gap-1.5">
          <Clock className="w-2.5 h-2.5" /> {isIncoming ? 'Incoming Request' : 'Sent Request'}
        </div>
        <p className="text-sm font-black text-white tabular-nums">{request.amount?.toLocaleString()} WNC</p>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <Avatar className="w-10 h-10 rounded-xl border border-white/10 bg-black">
          <AvatarImage src={photo} className="object-cover" />
          <AvatarFallback className="bg-zinc-900 text-primary font-black">{(peer?.name || 'U')[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{isIncoming ? 'From Identity' : 'Target Identity'}</p>
          <p className="text-sm font-black text-white truncate tracking-tight uppercase">@{peer?.name || 'User'}</p>
        </div>
      </div>
      {isIncoming && (
        <Button 
          onClick={onAccept} 
          className={cn(
            "w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all bg-primary shadow-primary/20"
          )}
        >
          Accept & Pay Escrow
        </Button>
      )}
      {!isIncoming && (
        <div className="p-3 bg-black/20 rounded-xl text-center">
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Waiting for Seller...</p>
        </div>
      )}
    </div>
  );
}

function TradeCard({ trade, currentUserId }: { trade: EscrowTrade, currentUserId: string }) {
  const router = useRouter();
  const isBuyer = trade.buyer_id === currentUserId;
  const peer = isBuyer ? trade.seller : trade.buyer;
  const photo = peer?.photo_url || peer?.avatar_url || '';

  const statusMap: any = {
    'PENDING': { label: 'Awaiting Payment', color: "text-zinc-400 bg-zinc-500/10" },
    'FUNDED': { label: 'Payment Sent', color: "text-blue-400 bg-blue-500/10" },
    'DELIVERING': { label: 'In Progress', color: "text-amber-400 bg-amber-500/10" },
    'COMPLETED': { label: 'Completed', color: "text-green-500 bg-green-500/10" },
    'DISPUTED': { label: 'Registry Locked', color: "text-red-500 bg-red-500/10" }
  };

  const status = statusMap[trade.status] || { label: trade.status, color: "bg-white/5" };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => router.push(`/escrow/${trade.id}`)} className="p-5 rounded-[2.5rem] bg-[#0a0a0c] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer group shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/5", status.color)}>{status.label}</div>
        <p className="text-sm font-black text-white tabular-nums">{trade.amount_wnc?.toLocaleString()} WNC</p>
      </div>
      <div className="flex items-center gap-4">
        <Avatar className="w-11 h-11 rounded-2xl border border-white/10 shadow-lg bg-black">
          <AvatarImage src={photo} className="object-cover" />
          <AvatarFallback className="bg-primary/20 text-primary font-black text-sm">{(peer?.name || 'U')[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{isBuyer ? 'Seller' : 'Buyer'}</p>
          <p className="text-sm font-black text-white truncate tracking-tight uppercase">@{peer?.name || 'User'}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-primary transition-all group-hover:translate-x-1" />
      </div>
    </motion.div>
  );
}

function EmptyState({ title, desc, icon: Icon }: { title: string, desc: string, icon: any }) {
  return (
    <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 opacity-30 border border-dashed border-white/10 rounded-[2.5rem]">
      <Icon className="w-10 h-10 text-white" />
      <div className="space-y-1">
        <p className="text-xs font-black uppercase tracking-widest text-white">{title}</p>
        <p className="text-[9px] font-medium leading-relaxed max-w-[180px] mx-auto">{desc}</p>
      </div>
    </div>
  );
}