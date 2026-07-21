
'use client';

/**
 * 0X PROTOCOL SWAP ENGINE (SAME-CHAIN)
 * Version: 8.0.0 (Modular Library Integration)
 * 
 * Uses the dedicated src/lib/0x/ module for all same-chain handshakes.
 */

import { fetch0xQuote } from '@/lib/0x/fetchQuote';
import { execute0xSwap } from '@/lib/0x/executeSwap';
import { ethers } from 'ethers';
import type { AssetRow } from '@/lib/types';

export interface ZeroXQuoteResult {
  receiveAmount: number;
  feeUsd: number;
  platformFeeAmt: number;
  rawQuote: any;
  success: boolean;
  error?: string;
}

/**
 * Fetches 0x quote using the new modular library.
 */
export async function fetchZeroXQuote(params: {
  chainId: number;
  toChainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  takerAddress: string;
  priceUsd: number;
  toTokenDecimals: number;
  ethPrice: number;
}): Promise<ZeroXQuoteResult> {
  try {
    const quote = await fetch0xQuote(params.sellToken, params.buyToken, params.sellAmount, params.takerAddress, params.chainId);
    
    return {
      receiveAmount: parseFloat(ethers.formatUnits(quote.buyAmount, params.toTokenDecimals)),
      feeUsd: 0, 
      platformFeeAmt: 0,
      rawQuote: quote,
      success: true
    };
  } catch (e: any) {
    return {
      receiveAmount: 0,
      feeUsd: 0,
      platformFeeAmt: 0,
      rawQuote: null,
      success: false,
      error: e.message
    };
  }
}

/**
 * Executes 0x swap using the new modular library.
 */
export async function executeZeroXSwap(params: {
  chainId: number;
  chainName: string;
  rawQuote: any;
  wallet: ethers.Wallet;
  fromToken: AssetRow;
  amount: string;
  setPhase: (phase: any) => void;
}) {
  const { wallet, rawQuote, setPhase } = params;
  
  try {
    setPhase('SENDING');
    const receipt = await execute0xSwap(rawQuote, wallet);
    console.log('0x swap successful:', receipt?.hash);
    return receipt;
  } catch (error: any) {
    console.error('0x execution failed:', error.message);
    throw error;
  }
}
