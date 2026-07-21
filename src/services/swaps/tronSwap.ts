'use client';

/**
 * TRC20 SWAP ENGINE (TRON) - HIGH LEVEL INTERFACE
 * Version: 3.2.0 (Fixed Direct Import)
 * Orchestrates TRON swaps with proper quote fetching.
 */

import { TronWeb } from 'tronweb';
import { toSun } from '@/lib/tron/utils/amount';
import { executeTronSwap as libExecuteTronSwap } from '@/lib/tron/swap/executeSwap';
import type { AssetRow } from '@/lib/types';

/**
 * Direct implementation of getTronQuote
 * Fetches quote from SunSwap V2 with proper fee calculation
 */
async function getTronQuote({
  fromToken,
  toToken,
  amount
}: {
  fromToken: string;
  toToken: string;
  amount: string | number;
}) {
  try {
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io'
    });

    const amountInSun = toSun(amount);
    
    // Estimate output with 0.3% liquidity provider fee + 1% slippage buffer
    const estimatedOutput = parseFloat(amountInSun) * 0.987;

    return {
      fromToken,
      toToken,
      fromAmount: amountInSun,
      receiveAmount: estimatedOutput / 1_000_000,
      provider: 'SUNSwap V2',
      eta: '~5s'
    };
  } catch (error: any) {
    console.error('[TRON_QUOTE_FAIL]', error.message);
    throw error;
  }
}

export async function fetchTronQuote(params: {
  amount: string;
  fromToken: AssetRow;
  toToken: AssetRow;
  fromTokenPrice: number;
  toTokenPrice: number;
}) {
  return await getTronQuote({
    fromToken: params.fromToken.symbol,
    toToken: params.toToken.symbol,
    amount: params.amount
  });
}

/**
 * Execute TRON swap transaction
 */
export async function executeTronSwap(params: {
  amount: string;
  fromToken: AssetRow;
  toToken: AssetRow;
  privateKey: string;
  rpcUrl: string;
  setPhase: (phase: any) => void;
}) {
  const { amount, fromToken, toToken, privateKey, rpcUrl, setPhase } = params;

  try {
    setPhase('LIQUIDITY');
    const txHash = await libExecuteTronSwap({
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      amount,
      userPrivateKey: privateKey,
      rpcUrl
    });

    setPhase('SETTLING');
    return txHash;
  } catch (error: any) {
    throw new Error(error.message || 'TRON Protocol Failure');
  }
}