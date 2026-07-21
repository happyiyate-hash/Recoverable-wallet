
'use client';

import * as algosdk from "algosdk";
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * Algorand (ALGO) Adapter
 * Handles real-time balance discovery via the Algorand Node API.
 */
class AlgorandAdapter implements IWalletAdapter {
    private client: any;

    constructor(chain: ChainConfig) {
        // Institutional access via Algonode
        this.client = new (algosdk as any).Algodv2("", chain.rpcUrl, "");
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        try {
            const accountInfo = await this.client.accountInformation(ownerAddress).do();
            
            // 1 ALGO = 1,000,000 microALGO
            const balanceAlgo = (accountInfo.amount / 1_000_000).toString();

            return assets.map(asset => {
                if (asset.symbol === 'ALGO') {
                    return { ...asset, balance: balanceAlgo } as AssetRow;
                }
                // Placeholder for ASA tokens
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[ALGO_ADAPTER_ERROR] ${ownerAddress}:`, error.message);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }
}

export const algorandAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'algorand') return new AlgorandAdapter(chain);
    return null;
};
