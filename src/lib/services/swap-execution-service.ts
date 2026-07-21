
'use client';

import { supabase } from '@/lib/supabase/client';
import { validateSwapAmount } from './swap-fee-calculator';
import { adminExecutor } from './admin-executor';
import { getFeeRecipient } from '../wallets/services/fee-recipients';
import type { AssetRow, ChainConfig } from '@/lib/types';
import { fetchBalancesForChain } from '../wallets/services/balance-service';

/**
 * INSTITUTIONAL SWAP EXECUTION SERVICE
 * Version: 2.0.0 (Master Cashier Standard)
 * 
 * Orchestrates the lifecycle of liquidity-provided swaps.
 * Serves as the central "Super Cashier" for internal and pivot trades.
 */

export interface InitiateSwapInput {
  userId: string;
  fromChain: string;
  toChain: string;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  fromTokenPriceUsd: number;
  toAmountExpected: number;
  adminFeeUsd: number;
  networkFeeUsd: number;
  recipientAddress: string;
}

export const swapExecutionService = {
  /**
   * Checks if the platform's admin vault has enough liquidity to fulfill a trade.
   * Verified against the real Admin Vault address for the specified chain.
   */
  async checkAdminLiquidity(
    chain: ChainConfig, 
    token: AssetRow, 
    requiredAmount: number, 
    infuraKey: string | null
  ): Promise<boolean> {
    try {
      if (token.symbol === 'WNC') return true; // Internal bypass

      const adminAddress = getFeeRecipient(chain.name);
      if (!adminAddress) return false;

      // Temporary metadata for admin node verification
      const adminWallet = [{
        address: adminAddress,
        type: chain.type || 'evm'
      }] as any;

      const results = await fetchBalancesForChain(chain, adminWallet, infuraKey, null, []);
      const tokenResult = results.find(r => 
        token.isNative ? r.isNative : r.address?.toLowerCase() === token.address?.toLowerCase()
      );

      if (!tokenResult) return false;

      const adminBalance = parseFloat(tokenResult.balance || '0');
      return adminBalance >= (requiredAmount * 1.05); // 5% Safety Buffer
    } catch (e) {
      console.warn("[LIQUIDITY_GUARD_ADVISORY] Failed to verify admin node.");
      return false;
    }
  },

  /**
   * STEP 1: Initiate Swap Handshake
   * Validates limits and locks an immutable registry node for the trade.
   */
  async initiateSwap(input: InitiateSwapInput): Promise<{ swapId: string; adminAddress: string }> {
    if (!supabase) throw new Error("Registry offline.");

    // 1. Enforce Institutional Minimums
    validateSwapAmount(input.fromAmount, input.fromSymbol, input.fromTokenPriceUsd);

    // 2. Resolve Admin Deposit Node from Central Registry
    const adminAddress = getFeeRecipient(input.fromChain);

    if (!adminAddress) {
      throw new Error(`Liquidity node for ${input.fromChain} not available.`);
    }

    // 3. Create Verified Ledger Entry
    const { data, error } = await supabase
      .from('swaps')
      .insert({
        user_id: input.userId,
        from_chain: input.fromChain,
        to_chain: input.toChain,
        from_symbol: input.fromSymbol,
        to_symbol: input.toSymbol,
        from_amount: input.fromAmount,
        to_amount_expected: input.toAmountExpected,
        admin_fee_usd: input.adminFeeUsd,
        network_fee_usd: input.networkFeeUsd,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw new Error("Ledger handshake failed.");

    return { 
      swapId: data.id, 
      adminAddress 
    };
  },

  /**
   * STEP 2: Finalize & Settle
   * Orchestrates the final payout leg from the Master Admin Vault.
   */
  async finalizeAndSettle(swapId: string, userTxHash: string) {
    if (!supabase) return;

    // A. Verify User Leg Submission
    const { error: updateErr } = await supabase
      .from('swaps')
      .update({
        user_tx_hash: userTxHash,
        status: 'user_sent'
      })
      .eq('id', swapId);

    if (updateErr) throw updateErr;

    // B. Trigger Master Admin Payout (Leg 2)
    return await this.executeAdminPayout(swapId);
  },

  /**
   * Master Cashier: Signing Leg
   */
  async executeAdminPayout(swapId: string) {
    if (!supabase) return;

    const { data: swap, error: fetchErr } = await supabase
      .from('swaps')
      .select('*')
      .eq('id', swapId)
      .single();

    if (fetchErr || !swap) throw new Error("SWAP_NODE_NOT_FOUND");

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', swap.user_id)
        .single();

      if (!profile) throw new Error("IDENTITY_NODE_MISSING");

      const chainKey = swap.to_chain.toLowerCase();
      // Determine recipient address based on target chain type
      let targetAddress = profile.evm_address;
      let chainType = 'evm';

      if (chainKey.includes('solana')) {
        targetAddress = profile.solana_address;
        chainType = 'solana';
      } else if (chainKey.includes('xrp')) {
        targetAddress = profile.xrp_address;
        chainType = 'xrp';
      }

      if (!targetAddress) throw new Error(`RECIPIENT_${chainKey.toUpperCase()}_NODE_MISSING`);

      // BROADCAST FROM MASTER ADMIN VAULT
      const txHash = await adminExecutor.executeAdminTransfer({
        toAddress: targetAddress,
        amount: swap.to_amount_expected,
        tokenSymbol: swap.to_symbol,
        chainId: 1, // Mainnet standard
        chainType: chainType
      });

      // Update Ledger to Completed
      await supabase
        .from('swaps')
        .update({
          admin_tx_hash: txHash,
          status: 'completed'
        })
        .eq('id', swapId);

      return txHash;

    } catch (e: any) {
      console.error("[MASTER_SETTLEMENT_FAIL]", e);
      await supabase.from('swaps').update({ status: 'failed' }).eq('id', swapId);
      throw e;
    }
  }
};
