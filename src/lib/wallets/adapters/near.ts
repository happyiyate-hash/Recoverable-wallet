
'use client';

import { connect, keyStores, utils } from "near-api-js";
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * NEAR Protocol Adapter
 * Handles real-time balance fetching for NEAR accounts using near-api-js.
 */
class NearAdapter implements IWalletAdapter {
    private rpcUrl: string;
    private networkId: string;

    constructor(chain: ChainConfig) {
        this.rpcUrl = chain.rpcUrl;
        this.networkId = chain.chainId === 397 ? "mainnet" : "testnet";
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        try {
            const near = await connect({
                networkId: this.networkId,
                nodeUrl: this.rpcUrl,
                keyStore: new keyStores.InMemoryKeyStore(),
                headers: {}
            });

            const account = await near.account(ownerAddress);
            const balanceData = await account.getAccountBalance();
            
            // balanceData.available is in yoctoNEAR
            const balanceNear = utils.format.formatNearAmount(balanceData.available, 5);

            return assets.map(asset => {
                if (asset.symbol === 'NEAR') {
                    return { ...asset, balance: balanceNear } as AssetRow;
                }
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[NEAR_ADAPTER_ERROR] ${this.rpcUrl}:`, error.message || error);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }
}

export const nearAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'near') return new NearAdapter(chain);
    return null;
};
