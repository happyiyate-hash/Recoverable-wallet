/**
 * ⚠️ IMPORTANT INSTRUCTION:
 * - Only implement quote fetching and swap execution for same-chain TRX swaps.
 * - Do not add any new features or change unrelated logic.
 */

import { TronQuote } from './types';

export async function fetchTronQuote(fromToken: string, toToken: string, amount: string): Promise<TronQuote> {
  // Institutional Registry: Fetching best rate from TRON DEX nodes
  const response = await fetch(`https://api.sunswap.com/v2/quote?from=${fromToken}&to=${toToken}&amount=${amount}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || response.statusText || 'TRX API Error';
    throw new Error(`TRX API Error: ${errorMsg}`);
  }

  return {
    fromToken,
    toToken,
    amount,
    receiveAmount: data.outAmount || (parseFloat(amount) * 0.99), // Placeholder logic if API restricted
    rawQuote: data
  };
}
