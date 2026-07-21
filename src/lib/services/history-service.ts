
'use client';

import { Alchemy, Network } from "alchemy-sdk";

/**
 * INSTITUTIONAL UNIFIED HISTORY SERVICE
 * Version: 5.0.0 (Alchemy Asset Transfer Integration)
 */

const ALCHEMY_KEY = "OavIajgLF0PNfqGpd31B_";

const EXPLORER_CONFIG: Record<number, { api: string; url: string; nativeSymbol: string }> = {
  1: { api: "https://api.etherscan.io/api", url: "https://etherscan.io", nativeSymbol: "ETH" },
  137: { api: "https://api.polygonscan.com/api", url: "https://polygonscan.com", nativeSymbol: "POL" },
  56: { api: "https://api.bscscan.com/api", url: "https://bscscan.com", nativeSymbol: "BNB" },
  42161: { api: "https://api.arbiscan.io/api", url: "https://arbiscan.io", nativeSymbol: "ETH" },
  10: { api: "https://api-optimistic.etherscan.io/api", url: "https://optimistic.etherscan.io", nativeSymbol: "ETH" },
  8453: { api: "https://api.basescan.org/api", url: "https://basescan.org", nativeSymbol: "ETH" },
};

export interface UnifiedTransaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  amount: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  isOut: boolean;
  type: string;
  explorerUrl?: string;
}

const CHAIN_TO_ALCHEMY_NETWORK: Record<number, Network> = {
  1: Network.ETH_MAINNET,
  137: Network.MATIC_MAINNET,
  10: Network.OPT_MAINNET,
  42161: Network.ARB_MAINNET,
  8453: Network.BASE_MAINNET,
};

export const historyService = {
  /**
   * Fetches real on-chain history via Explorer APIs or Alchemy Fallback.
   */
  async fetchOnChainHistory(address: string, chainId: number, tokenAddress?: string): Promise<UnifiedTransaction[]> {
    if (!address) return [];

    const config = EXPLORER_CONFIG[chainId];
    const isNative = !tokenAddress || tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    if (config) {
      try {
        const action = isNative ? 'txlist' : 'tokentx';
        const contractParam = isNative ? '' : `&contractaddress=${tokenAddress}`;
        const url = `${config.api}?module=account&action=${action}${contractParam}&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === '1' && Array.from(data.result).length > 0) {
          return data.result.map((tx: any) => {
            const isOut = tx.from.toLowerCase() === address.toLowerCase();
            const decimals = parseInt(tx.tokenDecimal || "18");
            const value = isNative ? (parseFloat(tx.value) / 1e18) : (parseFloat(tx.value) / Math.pow(10, decimals));

            return {
              id: tx.hash || tx.id,
              hash: tx.hash,
              from: tx.from,
              to: tx.to || 'Contract Interaction',
              amount: value,
              timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
              status: 'completed',
              isOut,
              type: isNative ? 'Native Transfer' : (tx.tokenSymbol || 'Token Transfer'),
              explorerUrl: `${config.url}/tx/${tx.hash}`
            };
          });
        }
      } catch (e: any) {
        console.warn(`[EXPLORER_FETCH_FAIL] for ${chainId}:`, e.message);
      }
    }

    // FALLBACK: Alchemy (if available and configured)
    const network = CHAIN_TO_ALCHEMY_NETWORK[chainId];
    if (network) {
      try {
        const alchemy = new Alchemy({ apiKey: ALCHEMY_KEY, network });
        const [received, sent] = await Promise.all([
          alchemy.core.getAssetTransfers({
            toAddress: address,
            contractAddresses: tokenAddress && !isNative ? [tokenAddress] : undefined,
            category: ["external", "erc20"] as any,
            maxCount: 20
          }),
          alchemy.core.getAssetTransfers({
            fromAddress: address,
            contractAddresses: tokenAddress && !isNative ? [tokenAddress] : undefined,
            category: ["external", "erc20"] as any,
            maxCount: 20
          })
        ]);

        const merged = [...received.transfers, ...sent.transfers].sort((a, b) => 
          parseInt(b.blockNum, 16) - parseInt(a.blockNum, 16)
        );

        return merged.map(tx => {
          const isOut = tx.from.toLowerCase() === address.toLowerCase();
          const explorerBase = EXPLORER_CONFIG[chainId]?.url || 'https://etherscan.io';
          
          return {
            id: tx.hash,
            hash: tx.hash,
            from: tx.from,
            to: tx.to || 'Unknown',
            amount: tx.value || 0,
            timestamp: new Date().toISOString(),
            status: 'completed',
            isOut,
            type: tx.category,
            explorerUrl: `${explorerBase}/tx/${tx.hash}`
          };
        });
      } catch (e: any) {
        console.error("[ALCHEMY_HISTORY_FAIL]", e.message);
      }
    }

    return [];
  }
};
