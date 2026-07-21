
'use client';

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * Sui (SUI) Adapter
 * Handles real-time balance discovery via the Sui Fullnode API.
 * Re-engineered for modern modular SDK (@mysten/sui).
 */
class SuiAdapter implements IWalletAdapter {
    private client: SuiClient;

    constructor(chain: ChainConfig) {
        this.client = new SuiClient({ url: chain.rpcUrl || getFullnodeUrl('mainnet') });
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        try {
            // Sui balances are aggregated from coin objects
            const coins = await this.client.getCoins({ 
                owner: ownerAddress, 
                coinType: "0x2::sui::SUI" 
            });
            
            let totalMist = 0;
            coins.data.forEach((c: any) => {
                totalMist += Number(c.balance);
            });

            // 1 SUI = 1,000,000,000 MIST
            const balanceSui = (totalMist / 1_000_000_000).toString();

            return assets.map(asset => {
                if (asset.symbol === 'SUI') {
                    return { ...asset, balance: balanceSui } as AssetRow;
                }
                // Placeholder for other Sui objects/tokens
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[SUI_ADAPTER_ERROR] ${ownerAddress}:`, error.message);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }
}

export const suiAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'sui') return new SuiAdapter(chain);
    return null;
};
