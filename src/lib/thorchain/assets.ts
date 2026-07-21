/**
 * THORCHAIN SUPPORTED ASSETS & NETWORKS
 * Version: 3.0.0 (Comprehensive Non-EVM Registry)
 */

export interface ThorchainAsset {
  identifier: string;
  decimals: number;
  chain: string;
}

/**
 * Authoritative mapping for THORChain assets.
 * Uses the strict CHAIN.SYMBOL notation required by Thornode.
 */
export const thorchainAssets: Record<string, ThorchainAsset> = {
  BTC: { identifier: "BTC.BTC", decimals: 8, chain: "BTC" },
  ETH: { identifier: "ETH.ETH", decimals: 18, chain: "ETH" },
  SOL: { identifier: "SOL.SOL", decimals: 9, chain: "SOL" },
  LTC: { identifier: "LTC.LTC", decimals: 8, chain: "LTC" },
  DOGE: { identifier: "DOGE.DOGE", decimals: 8, chain: "DOGE" },
  ATOM: { identifier: "GAIA.ATOM", decimals: 6, chain: "GAIA" },
  AVAX: { identifier: "AVAX.AVAX", decimals: 18, chain: "AVAX" },
  BNB: { identifier: "BNB.BNB", decimals: 8, chain: "BNB" },
  // Stablecoin Nodes
  USDT: { identifier: "ETH.USDT-0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, chain: "ETH" },
  USDC: { identifier: "ETH.USDC-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, chain: "ETH" },
};
