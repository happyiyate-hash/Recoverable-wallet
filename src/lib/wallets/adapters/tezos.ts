
'use client';

import { TezosToolkit } from "@taquito/taquito";
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * Tezos (XTZ) Adapter
 * Handles real-time balance discovery via the Taquito SDK.
 */
class TezosAdapter implements IWalletAdapter {
    private tezos: TezosToolkit;

    constructor(chain: ChainConfig) {
        this.tezos = new TezosToolkit(chain.rpcUrl);
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        try {
            const balanceMutez = await this.tezos.tz.getBalance(ownerAddress);
            
            // 1 XTZ = 1,000,000 mutez
            const balanceXtz = (balanceMutez.toNumber() / 1_000_000).toString();

            return assets.map(asset => {
                if (asset.symbol === 'XTZ') {
                    return { ...asset, balance: balanceXtz } as AssetRow;
                }
                // Placeholder for FA1.2 / FA2 tokens
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[XTZ_ADAPTER_ERROR] ${ownerAddress}:`, error.message);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }
}

export const tezosAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'tezos') return new TezosAdapter(chain);
    return null;
};
