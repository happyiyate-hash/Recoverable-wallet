
'use client';

import { fetchPriceMap, fetchPricesByContract, COINGECKO_PLATFORM_MAP } from '@/lib/coingecko';
import type { AssetRow, ChainConfig } from '@/lib/types';
import { getInitialAssets } from '@/lib/wallets/balances';
import { fetchTokenPricesFromMetadata } from '@/lib/getTokenLogo';

/**
 * INSTITUTIONAL MARKET DYNAMICS SERVICE
 * Version: 13.0.0 (Strict Network ID Mapping)
 * 
 * Rules:
 * 1. PRIORITIZE chain coingeckoId for native gas tokens to prevent symbol misuse.
 * 2. Ensure Scroll, Optimism, etc. use their specific price nodes.
 */

export interface PriceResult {
  [id: string]: {
    price: number;
    change: number;
  };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function calculateDelta(current: number, previous: number): number {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function getWncOpeningPrice(currentPrice: number): number {
  const now = new Date();
  const dateString = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
  
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
    hash |= 0;
  }
  
  const absHash = Math.abs(hash);
  const varianceFactor = (absHash % 500) - 250; 
  const variancePercent = varianceFactor / 10000; 
  
  return currentPrice * (1 + variancePercent);
}

export async function fetchGlobalMarketData(
  chains: ChainConfig[],
  customTokens: AssetRow[],
  currentRates: { [key: string]: number }
): Promise<PriceResult> {
  const coingeckoIds = new Set<string>();
  const platformTokens: { [platform: string]: Set<string> } = {};
  const allKnownAssets: AssetRow[] = [];

  chains.forEach(chain => {
    const base = getInitialAssets(chain.chainId);
    allKnownAssets.push(...base.map(a => {
        // PRIORITY: Inject coingeckoId from network config for native assets
        // This prevents Scroll/Optimism from defaulting to 'ethereum' if defined specifically in evmNetworks.json
        if (a.isNative && chain.coingeckoId) {
            return { ...a, chainId: chain.chainId, coingeckoId: chain.coingeckoId } as AssetRow;
        }
        return { ...a, chainId: chain.chainId } as AssetRow;
    }));
  });
  
  allKnownAssets.push(...customTokens);

  allKnownAssets.forEach(a => {
    if (a.coingeckoId) {
      coingeckoIds.add(a.coingeckoId.toLowerCase());
    } else if (!a.isNative && a.address?.startsWith('0x')) {
      const platform = COINGECKO_PLATFORM_MAP[a.chainId];
      if (platform) {
        if (!platformTokens[platform]) platformTokens[platform] = new Set();
        platformTokens[platform].add(a.address.toLowerCase());
      }
    }
  });

  const newPrices: PriceResult = {};

  try {
    // STAGE 1: Standard ID Batch (Native & Whitelisted)
    if (coingeckoIds.size > 0) {
        const idPrices = await fetchPriceMap(Array.from(coingeckoIds));
        Object.entries(idPrices).forEach(([key, data]: [string, any]) => {
            newPrices[key.toLowerCase()] = { 
                price: typeof data === 'number' ? data : (data.usd || 0), 
                change: data.usd_24h_change || 0 
            };
        });
    }

    // STAGE 2: Platform Sequence (ERC-20 Contracts)
    const platforms = Object.entries(platformTokens);
    for (const [platform, addresses] of platforms) {
        const contractPrices = await fetchPricesByContract(platform, Array.from(addresses));
        Object.entries(contractPrices).forEach(([key, data]: [string, any]) => {
            newPrices[key.toLowerCase()] = { 
                price: data.usd || 0, 
                change: data.usd_24h_change || 0 
            };
        });
        await sleep(200);
    }

    // STAGE 3: SECURE METADATA HANDSHAKE (Custom Registry)
    const missingTokens = allKnownAssets.filter(a => {
        const id = (a.priceId || a.coingeckoId || a.address || '').toLowerCase();
        return !newPrices[id];
    });

    if (missingTokens.length > 0) {
        const contractList = missingTokens.map(t => (t.address || '').toLowerCase()).filter(addr => addr.startsWith('0x'));
        if (contractList.length > 0) {
            const metadataPrices = await fetchTokenPricesFromMetadata(contractList);
            if (metadataPrices) {
                metadataPrices.forEach(m => {
                    const price = m.token_details?.priceUsd;
                    if (price) {
                        newPrices[m.contract_address.toLowerCase()] = { 
                            price: price, 
                            change: m.token_details?.pctChange24h || 0 
                        };
                    }
                });
            }
        }
    }

    // WNC VALUATION
    const ngnRate = currentRates['NGN'] || 1650;
    const wncCurrentPrice = 1 / ngnRate;
    const wncOpeningPrice = getWncOpeningPrice(wncCurrentPrice);
    const wncChange = calculateDelta(wncCurrentPrice, wncOpeningPrice);

    newPrices['internal:wnc'] = {
      price: wncCurrentPrice,
      change: wncChange
    };

    // STAGE 4: FIXED PRICE HANDSHAKE
    newPrices['stablecoin'] = {
      price: 1.0,
      change: 0
    };

  } catch (e) {
    console.warn("[MARKET_SERVICE_ERROR] Handshake interrupted.");
  }

  return newPrices;
}
