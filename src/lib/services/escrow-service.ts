'use client';

import { supabase } from '@/lib/supabase/client';
import type { Review, EscrowListing, EscrowRequest } from '@/lib/types';

/**
 * INSTITUTIONAL ESCROW PRODUCTION SERVICE
 * Version: 38.0.0 (Resilient Visibility Patch)
 */

export type EscrowStatus = 'PENDING' | 'FUNDED' | 'DELIVERING' | 'COMPLETED' | 'DISPUTED';

export interface EscrowTrade {
  id: string;
  listing_id?: string;
  request_id?: string;
  buyer_id: string;
  seller_id: string;
  amount_wnc: number;
  escrow_balance: number;
  status: EscrowStatus;
  visibility: 'active' | 'completed' | 'hidden';
  dispute_reason?: string;
  resolved_by_admin: boolean;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  seller?: {
    id: string;
    name: string;
    photo_url?: string;
    avatar_url?: string;
    rating?: number;
    rating_count?: number;
    is_marketplace_seller?: boolean;
  };
  buyer?: {
    id: string;
    name: string;
    photo_url?: string;
    avatar_url?: string;
  };
  listing?: EscrowListing;
}

export interface EscrowMessage {
  id: string;
  trade_id: string;
  sender_id: string;
  message: string;
  is_system: boolean;
  created_at: string;
}

export const escrowService = {
  /**
   * Fetches the entire escrow state using parallel resilient queries.
   * Version: 2.0.0 (Visibility Patch)
   */
  async fetchEscrowDashboard(userId: string) {
    if (!supabase || !userId) return { marketplace: [], my_listings: [], requests: [], trades: [] };
    
    try {
      console.log(`[REGISTRY_AUDIT] Initializing global escrow fetch for Node: ${userId}`);

      const [listingsRes, requestsRes, tradesRes] = await Promise.all([
        // 🌍 PUBLIC MARKETPLACE (Filtered by Registry Status)
        supabase
          .from('escrow_listings')
          .select(`
            *,
            seller:profiles(
              id, name, photo_url, avatar_url, rating, rating_count
            )
          `)
          .eq('status', 'open')
          .eq('visibility', 'public')
          .order('created_at', { ascending: false }),

        // 📩 HANDSHAKE REQUESTS
        supabase
          .from('escrow_requests')
          .select(`
            *,
            requester:profiles(id, name, photo_url, avatar_url),
            receiver:profiles(id, name, photo_url, avatar_url)
          `)
          .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false }),

        // 🤝 ACTIVE TRADES
        supabase
          .from('escrow_trades')
          .select(`
            *,
            seller:profiles(id, name, photo_url, avatar_url, rating, rating_count),
            buyer:profiles(id, name, photo_url, avatar_url),
            listing:listing_id(*)
          `)
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
          .neq('visibility', 'hidden')
          .order('created_at', { ascending: false })
      ]);

      // 🔍 TECHNICAL AUDIT
      if (listingsRes.error) console.warn("[REGISTRY_WARN] Marketplace fetch deferred:", listingsRes.error.message);
      if (requestsRes.error) console.warn("[REGISTRY_WARN] Requests fetch deferred:", requestsRes.error.message);
      if (tradesRes.error) console.warn("[REGISTRY_WARN] Trades fetch deferred:", tradesRes.error.message);

      const allListings = listingsRes.data || [];
      
      // Separate marketplace (others) from personal listings
      const marketplace = allListings.filter(l => l.seller_id !== userId);
      const my_listings = allListings.filter(l => l.seller_id === userId);

      // ATOMIC DE-DUPLICATION for requests already converted to trades
      const activeTradeRequestIds = new Set(
        (tradesRes.data || [])
          .filter(t => t.request_id)
          .map(t => t.request_id)
      );
      
      const filteredRequests = (requestsRes.data || []).filter(r => !activeTradeRequestIds.has(r.id));

      return {
        marketplace: marketplace.map(l => ({ ...l, seller: l.seller || { name: 'Unknown Node' } })),
        requests: filteredRequests,
        trades: tradesRes.data || [],
        my_listings: my_listings.map(l => ({ ...l, seller: l.seller || { name: 'You' } }))
      };
    } catch (e: any) {
      console.error("[ESCROW_DASHBOARD_CRITICAL_FAIL]", e.message);
      return { marketplace: [], my_listings: [], requests: [], trades: [] };
    }
  },

  async resolveProfileByAccount(accountNumber: string) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.rpc('search_profile_by_account', {
        p_account_number: accountNumber
      });
      if (error) throw error;
      return data?.[0] || null;
    } catch (e) {
      return null;
    }
  },

  async fetchUserRating(userId: string) {
    if (!supabase) return { average: 0, count: 0, tier: 1 };
    try {
      const { data, error } = await supabase.rpc('get_user_rating', { p_user_id: userId });
      if (error) throw error;
      
      const { data: profile } = await supabase.from('profiles').select('tier').eq('id', userId).single();

      return {
        average: data.average || 0,
        count: data.total_count || 0,
        tier: profile?.tier || 1
      };
    } catch (e) {
      return { average: 0, count: 0, tier: 1 };
    }
  },

  async fetchReviewsForUser(userId: string): Promise<Review[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, reviewer:reviewer_id(name, photo_url, avatar_url)')
        .eq('subject_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Review[];
    } catch (e) {
      return [];
    }
  },

  async submitReview(params: {
    tradeId: string;
    reviewerId: string;
    subjectId: string;
    rating: number;
    comment?: string;
  }) {
    if (!supabase) throw new Error("Registry Offline");
    
    const { error } = await supabase.from('reviews').insert({
      trade_id: params.tradeId,
      reviewer_id: params.reviewerId,
      subject_id: params.subjectId,
      rating: params.rating,
      comment: params.comment || null
    });

    if (error) throw error;
    return true;
  },

  async createListing(params: {
    sellerId: string;
    type: string;
    asset?: string;
    amount?: number;
    priceWnc: number;
    description: string;
    targetBuyerId?: string;
  }) {
    if (!supabase) throw new Error("Registry Offline");

    if (params.type === 'private' && params.targetBuyerId) {
      const { data, error } = await supabase.rpc('create_private_escrow', {
        p_requester: params.sellerId,
        p_receiver: params.targetBuyerId,
        p_amount: Math.floor(params.priceWnc),
        p_description: params.description
      });
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('escrow_listings')
      .insert({
        seller_id: params.sellerId,
        type: params.type,
        asset: params.asset || null,
        amount: params.amount || null,
        price_wnc: Math.floor(params.priceWnc),
        description: params.description,
        status: 'open',
        visibility: 'public',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async joinListing(listing: EscrowListing, userId: string) {
    if (!supabase) throw new Error("Registry Offline");
    
    const { data, error } = await supabase
      .from('escrow_requests')
      .insert({
        requester_id: userId,
        receiver_id: listing.seller_id,
        listing_id: listing.id,
        amount: listing.price_wnc,
        description: "Joining marketplace offer.",
        status: 'pending',
        visibility: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('escrow_requests')
          .select('id')
          .eq('requester_id', userId)
          .eq('listing_id', listing.id)
          .eq('status', 'pending')
          .single();
        
        if (existing) return { alreadyExists: true, id: existing.id };
      }
      throw error;
    }

    return data;
  },

  async acceptRequest(requestId: string, userId: string) {
    if (!supabase) throw new Error("Registry Offline");
    const { data, error } = await supabase.rpc('accept_private_escrow', {
      p_request_id: requestId,
      p_user_id: userId
    });
    if (error) throw error;
    if (!data.success) throw new Error(data.message);
    return data.trade_id;
  },

  async getTrade(id: string): Promise<EscrowTrade | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('escrow_trades')
        .select(`
          *, 
          seller:profiles(
            id, name, photo_url, avatar_url, rating, rating_count
          ), 
          buyer:profiles(
            id, name, photo_url, avatar_url
          ), 
          listing:listing_id(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) return null;
      return data as EscrowTrade;
    } catch (e) { return null; }
  },

  async fetchMessages(tradeId: string): Promise<EscrowMessage[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from('escrow_messages')
      .select('*')
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: true });
    return (data || []) as EscrowMessage[];
  },

  async sendMessage(tradeId: string, senderId: string, message: string, isSystem = false) {
    if (!supabase) return;
    await supabase.from('escrow_messages').insert({
      trade_id: tradeId,
      sender_id: senderId,
      message,
      is_system: system
    });
  },

  async fundTrade(tradeId: string, buyerId: string) {
    if (!supabase) throw new Error("Registry Offline");
    const { data, error } = await supabase.rpc('fund_escrow', {
      p_trade_id: tradeId,
      p_buyer_id: buyerId
    });
    if (error) throw error;
    if (!data.success) throw new Error(data.message);
    return true;
  },

  async confirmDelivery(tradeId: string, sellerId: string) {
    if (!supabase) throw new Error("Registry Offline");
    const { data, error } = await supabase.rpc('deliver_escrow', {
      p_trade_id: tradeId,
      p_seller_id: sellerId
    });
    if (error) throw error;
    if (!data.success) throw new Error(data.message);
    return true;
  },

  async approveTrade(tradeId: string, buyerId: string) {
    if (!supabase) throw new Error("Registry Offline");
    const { data, error } = await supabase.rpc('approve_escrow', {
      p_trade_id: tradeId,
      p_buyer_id: buyerId
    });
    if (error) throw error;
    if (!data.success) throw new Error(data.message);
    return true;
  },

  async raiseDispute(tradeId: string, userId: string, reason: string) {
    if (!supabase) throw new Error("Registry Offline");
    const { data, error } = await supabase.rpc('raise_dispute', {
      p_trade_id: tradeId,
      p_user_id: userId,
      p_reason: reason
    });
    if (error) throw error;
    if (!data.success) throw new Error(data.message);
    return true;
  }
};