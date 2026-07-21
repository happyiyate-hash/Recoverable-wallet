/**
 * INSTITUTIONAL SWAP TYPES
 * Version: 1.0.0
 * Authority: Blueprint File 1
 */

export type Chain = string; 

export interface SwapRequest {
  userId: string;
  sourceChain: Chain;
  destinationChain: Chain;
  sourceAmount: number; // amount user wants to swap
}

export interface SwapFees {
  adminFee: number;
  gasFee: number;
  totalFee: number;
}

export interface SwapResponse {
  swapHash: string;
  fees: SwapFees;
  destinationAmount: number;
  status: 'pending' | 'completed' | 'failed';
}

export interface SwapTransaction {
  from: string; // source address (Admin Vault)
  to: string;   // destination address (User Wallet)
  amount: number;
  chain: Chain;
  tokenSymbol: string;
  tokenAddress?: string;
  signedTx?: string;
}
