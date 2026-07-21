
import type { AssetRow } from '@/lib/types';
import evmNetworks from '@/lib/evmNetworks.json';
import tokenRegistry from '@/lib/tokens/registry';

/**
 * INSTITUTIONAL ASSET REGISTRY
 * Version: 10.0.0 (Modular File Handshake)
 */

export function getInitialAssets(chainId: number): Omit<AssetRow, 'balance' | 'priceUsd' | 'fiatValueUsd' | 'pctChange24h' | 'iconUrl'>[] {
    const networks = evmNetworks as any;
    const config = networks[chainId];
    
    if (!config) return [];

    // 1. Resolve from Modular Chain Registry
    const registryTokens = tokenRegistry[chainId] || [];
    
    if (registryTokens.length > 0) {
        return registryTokens.map((t: any) => ({
            chainId: config.chainId,
            address: t.address,
            name: t.name,
            symbol: t.symbol,
            isNative: t.isNative || false,
            coingeckoId: t.coingeckoId,
            decimals: t.decimals || 18
        }));
    }

    // 2. Fallback to Basic Native Node (Layer 1 Only)
    return [{
        chainId: config.chainId,
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
        name: config.name,
        symbol: config.symbol,
        isNative: true,
        coingeckoId: config.coingeckoId || 'ethereum',
        decimals: getNativeDecimals(config.symbol)
    }];
}

function getNativeDecimals(sym: string): number {
    const s = sym.toUpperCase();
    if (s === 'BNB') return 18;
    if (s === 'BTC') return 8;
    if (s === 'XRP') return 6;
    if (s === 'DOT') return 10;
    if (s === 'KSM') return 12;
    if (s === 'SOL') return 9;
    if (s === 'NEAR') return 24;
    return 18;
}
