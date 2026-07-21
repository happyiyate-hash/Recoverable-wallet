
'use client';

import { getFeeRecipient } from '../wallets/services/fee-recipients';

/**
 * INSTITUTIONAL SPLIT-TRANSACTION SERVICE
 * Version: 1.0.0 (Chain Agnostic)
 * 
 * Prepares the mathematical and routing nodes for a split-payment handshake.
 */

export type ChainProtocol = "evm" | "utxo" | "solana-like" | "ledger-style";

export interface SplitTransactionOptions {
  chainName: string;
  recipientAddress: string;
  totalAmount: number;
  feePercent?: number; // Default 5% (0.05)
  tokenAddress?: string;
  isNative: boolean;
}

export interface PreparedSplit {
  protocol: ChainProtocol;
  userAmount: number;
  feeAmount: number;
  feeRecipient: string;
  recipientAddress: string;
  memo: string;
}

export function prepareSplitTransaction(options: SplitTransactionOptions): PreparedSplit {
  const { chainName, recipientAddress, totalAmount, feePercent = 0.05 } = options;
  const name = chainName.toLowerCase();

  // 1. Resolve Protocol Type
  let protocol: ChainProtocol = "evm";
  const utxoProtocols = ["bitcoin", "litecoin", "dogecoin"];
  const ledgerProtocols = ["xrp ledger", "polkadot", "kusama"];
  const solanaLike = ["solana", "near protocol", "cosmos hub", "osmosis", "secret network", "injective", "celestia", "cardano", "tron", "algorand", "hedera", "tezos", "aptos", "sui"];

  if (utxoProtocols.includes(name)) protocol = "utxo";
  else if (ledgerProtocols.includes(name)) protocol = "ledger-style";
  else if (solanaLike.includes(name)) protocol = "solana-like";

  // 2. Calculate Institutional Split
  const feeAmount = totalAmount * feePercent;
  const userAmount = totalAmount - feeAmount;

  // 3. Resolve Admin Target
  const feeRecipient = getFeeRecipient(chainName);

  return {
    protocol,
    userAmount,
    feeAmount,
    feeRecipient,
    recipientAddress,
    memo: `Institutional Split Dispatch: ${chainName.toUpperCase()}`
  };
}
