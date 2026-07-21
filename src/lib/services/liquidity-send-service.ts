'use client';

import { notificationService } from './notification-service';
import type { AssetRow, ChainConfig, UserProfile } from '@/lib/types';
import { calculateWncGaslessFee } from './swap-fee-calculator';

/**
 * INSTITUTIONAL LIQUIDITY SEND SERVICE (CLIENT INTERFACE)
 * Version: 7.0.0 (Atomic Handshake & Phase Support)
 * 
 * Orchestrates the "Pay with WNC" flow using the Verify-Lock-Release protocol.
 */

export const liquiditySendService = {
  /**
   * Initiates a sponsored dispatch handshake with the master admin gateway.
   */
  async executeGaslessSend(params: {
    userId: string;
    profile: UserProfile;
    targetToken: AssetRow;
    targetChain: ChainConfig;
    amount: number; // USD Amount from Input
    recipientAddress: string;
    wncPriceUsd: number;
    setPhase: (phase: any) => void;
  }) {
    const { userId, profile, targetToken, targetChain, amount, recipientAddress, wncPriceUsd, setPhase } = params;

    try {
      setPhase('VERIFYING');
      
      // 1. Calculate WNC Sponsorship Requirement
      const tokenPriceUsd = targetToken.priceUsd || 1.0;
      const cryptoAmount = amount / tokenPriceUsd;
      
      const { wncFee } = await calculateWncGaslessFee(targetChain.name, wncPriceUsd);
      const wncValueCost = amount / (wncPriceUsd || 0.0006);
      const totalWncToDeduct = Math.ceil(wncValueCost + wncFee);
      
      // 2. Initial Audit Node
      if ((profile.wnc_earnings || 0) < totalWncToDeduct) {
        throw new Error(`INSUFFICIENT_WNC: Required ${totalWncToDeduct} WNC.`);
      }

      setPhase('LIQUIDITY_LOCK');

      // 3. Dispatch to Master Cashier (Server-Side Atomic Settlement)
      const requestPayload = {
        userId: userId,
        destinationAddress: recipientAddress,
        token: targetToken.symbol,
        tokenAddress: targetToken.isNative ? undefined : targetToken.address,
        amount: cryptoAmount,
        paymentCurrency: "WNC",
        network: targetChain.name,
        chainId: targetChain.chainId,
        chainType: targetChain.type || 'evm',
        wncAmountToDeduct: totalWncToDeduct
      };

      const res = await fetch('/api/admin/pay-with-wnc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
          const errorMsg = data.message || "Institutional Handshake Denied.";
          const errorCode = data.errorCode || "EXECUTION_ERROR";
          throw new Error(`[${errorCode}] ${errorMsg}`);
      }

      setPhase('SUCCESS');
      
      // 4. Ledger Notification
      await notificationService.send({
        userId: userId,
        type: 'TRANSFER_OUT',
        title: 'Sponsored Dispatch Complete',
        message: `Value of ${cryptoAmount.toFixed(4)} ${targetToken.symbol} settled via Master Cashier node.`,
        transactionId: data.txHash,
        amount: cryptoAmount,
        token: targetToken.symbol
      });

      return data.txHash;

    } catch (e: any) {
      console.error("[CASHIER_HANDSHAKE_FAIL]", e.message);
      setPhase('FAILED');
      throw e;
    }
  }
};
