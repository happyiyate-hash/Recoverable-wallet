'use client';

import { Bep2Service } from '../services/bep2-service';
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * BNB Beacon Chain (BEP2) Adapter
 * Version: 1.0.0 (REST-Native Discovery)
 */
class Bep2Adapter implements IWalletAdapter {
    constructor(private chain: ChainConfig) {}

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        try {
            const bnbBalances = await Bep2Service.getBalances(ownerAddress);

            return assets.map(asset => {
                // Find matching asset in BEP2 response
                // Native BNB is represented as "BNB" in the API
                const match = bnbBalances.find(b => b.symbol === asset.symbol);
                
                return {
                    ...asset,
                    balance: match ? match.free.toString() : '0'
                } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[BEP2_ADAPTER_ERROR] ${ownerAddress}:`, error.message);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }
}

export const bep2AdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'bep2') return new Bep2Adapter(chain);
    return null;
};
