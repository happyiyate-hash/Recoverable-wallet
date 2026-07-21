import { performTransactionDispatch } from '@/components/wallet/send/WalletComponents';

/**
 * THORCHAIN EXECUTION ENGINE
 * Version: 2.0.0 (Unified Dispatch + Memo Standard)
 * 
 * Orchestrates the "Deposit Leg" of a cross-chain swap.
 * User sends native funds to the THORChain vault with a specific instruction MEMO.
 */

interface ExecuteSwapRequest {
  fromToken: any;
  toToken: any;
  amount: string;
  wallets: any[];
  infuraApiKey: string | null;
  quote: any;
  profile: any;
}

export async function executeThorSwap({
  fromToken,
  toToken,
  amount,
  wallets,
  infuraApiKey,
  quote,
  profile
}: ExecuteSwapRequest) {
  try {
    console.log(`[THORCHAIN_EXECUTION] Dispatching deposit node to vault: ${quote.inboundAddress}`);
    console.log(`[THORCHAIN_MEMO] Instruction: ${quote.memo}`);

    // Resolve the active network for the SOURCE leg
    // This allows BTC, LTC, DOGE, ETH, SOL, etc. to be handled by the same dispatcher
    let networkType = 'evm';
    if (fromToken.symbol === 'BTC') networkType = 'btc';
    if (fromToken.symbol === 'LTC') networkType = 'ltc';
    if (fromToken.symbol === 'DOGE') networkType = 'doge';
    if (fromToken.symbol === 'SOL') networkType = 'solana';
    if (fromToken.symbol === 'ATOM') networkType = 'cosmos';

    // The "Execute" phase for THORChain is a specialized "Send" to the vault with a MEMO
    const txHash = await performTransactionDispatch({
      wallets,
      selectedToken: fromToken,
      resolvedAddress: quote.inboundAddress, // THORChain liquidity vault
      profile,
      activeNetwork: { type: networkType, name: fromToken.name, chainId: fromToken.chainId },
      amount,
      prices: {}, 
      recipientProfile: null, // Vault is an external system node
      infuraApiKey,
      memo: quote.memo // CRITICAL: Tells THORChain how to fulfill the swap
    });

    console.log("[THORCHAIN_EXECUTION] Settlement Node Dispatched:", txHash);
    return txHash;

  } catch (error: any) {
    console.error("[THORCHAIN_EXECUTION_FAIL]", error.message);
    throw error;
  }
}
