/**
 * ⚠️ IMPORTANT INSTRUCTION:
 * - Only implement quote fetching and swap execution for same-chain TRX swaps.
 * - Do not add any new features or change unrelated logic.
 */

export interface TronQuote {
  fromToken: string;
  toToken: string;
  amount: string;
  receiveAmount: number;
  rawQuote?: any;
}
