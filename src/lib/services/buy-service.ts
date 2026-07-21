
'use client';

import { supabase } from '@/lib/supabase/client';
import type { BuyOrder } from '@/lib/types';

/**
 * INSTITUTIONAL BUY SERVICE
 * Version: 1.0.0
 * Handles the registration and lifecycle of buy order intents.
 */
export interface BuyQuote {
  providerId: string;
  providerName: string;
  fiatAmount: number;
  fiatCurrency: string;
  cryptoAmount: number;
  feeTotal: number;
  platformFee: number;
  logoUrl?: string;
}

/**
 * INSTITUTIONAL BUY SERVICE
 * Version: 2.0.0
 * Handles the registration, lifecycle, and aggregation of buy order intents.
 */
export const buyService = {
  /**
   * Fetches real-time quotes from the internal aggregator engine.
   */
  async getQuotes(params: {
    amount: number;
    currency: string;
    asset: string;
    country: string;
  }): Promise<BuyQuote[]> {
    try {
      const response = await fetch('/api/buy/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) throw new Error('Failed to fetch quotes');
      const data = await response.json();
      return data.quotes || [];
    } catch (e) {
      console.error("[BUY_SERVICE] Quote aggregation failed:", e);
      return [];
    }
  },

  /**
   * Initializes a session with a specific provider.
   */
  async createSession(params: {
    providerId: string;
    amount: number;
    currency: string;
    asset: string;
    walletAddress: string;
  }) {
    try {
      const response = await fetch('/api/buy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) throw new Error('Failed to create checkout session');
      return await response.json();
    } catch (e) {
      console.error("[BUY_SERVICE] Session creation failed:", e);
      return null;
    }
  },

  async initiateOrder(params: {
    userId: string;
    token: string;
    network: string;
    fiatAmount: number;
    fiatCurrency: string;
    walletAddress: string;
    provider: string;
  }) {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('buy_orders')
        .insert({
          user_id: params.userId,
          token_symbol: params.token,
          network_name: params.network,
          fiat_amount: params.fiatAmount,
          fiat_currency: params.fiatCurrency,
          recipient_address: params.walletAddress,
          provider: params.provider,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.warn("[BUY_SERVICE] Failed to log order intent:", error.message);
        return null;
      }

      return data as BuyOrder;
    } catch (e) {
      console.error("[BUY_SERVICE_CRITICAL] Initialization failed.");
      return null;
    }
  }
};
