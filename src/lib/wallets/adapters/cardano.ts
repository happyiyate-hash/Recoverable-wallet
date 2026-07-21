
'use client';

import axios from 'axios';
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * Cardano (ADA) Adapter
 * Interacts with Blockfrost or similar indexers for balance and UTXO discovery.
 */
class CardanoAdapter implements IWalletAdapter {
    private apiUrl: string;
    // Note: In production, the Project ID would be handled via server-side env vars
    private projectId: string = 'mainnetPlaceholder'; 

    constructor(chain: ChainConfig) {
        this.apiUrl = chain.rpcUrl;
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        try {
            // Simplified Blockfrost-style balance discovery
            // In a real app, you'd fetch /addresses/{address} and sum the Lovelace
            const url = `${this.apiUrl}/addresses/${ownerAddress}`;
            
            // Mocking the successful response if no valid API key is present
            // In production, this would be a real GET request with project_id header
            const { data } = await axios.get(url, {
                headers: { 'project_id': this.projectId }
            }).catch(() => ({ data: { amount: [{ unit: 'lovelace', quantity: '0' }] } }));

            const lovelace = data.amount.find((a: any) => a.unit === 'lovelace')?.quantity || '0';
            const balanceAda = (Number(lovelace) / 1_000_000).toString();

            return assets.map(asset => {
                if (asset.symbol === 'ADA') {
                    return { ...asset, balance: balanceAda } as AssetRow;
                }
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[CARDANO_ADAPTER_ERROR] ${ownerAddress}:`, error.message);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }
}

export const cardanoAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'cardano') return new CardanoAdapter(chain);
    return null;
};
