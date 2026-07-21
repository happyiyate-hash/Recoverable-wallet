
'use client';

import { AptosClient, AptosAccount } from "aptos";
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * Aptos (APT) Adapter
 * Handles real-time balance discovery via the Aptos Fullnode API.
 * Updated for modern SDK v1.x standards using .toString() instead of .toHex().
 */
class AptosAdapter implements IWalletAdapter {
    private client: AptosClient;

    constructor(chain: ChainConfig) {
        this.client = new AptosClient(chain.rpcUrl);
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        try {
            // Aptos accounts store their coins in resources
            const resources = await this.client.getAccountResources(ownerAddress);
            const coinResource = resources.find((r: any) => 
                r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
            );
            
            const balanceOcta = coinResource ? (coinResource as any).data.coin.value : '0';
            // 1 APT = 100,000,000 Octas
            const balanceApt = (parseInt(balanceOcta) / 100_000_000).toString();

            return assets.map(asset => {
                if (asset.symbol === 'APT') {
                    return { ...asset, balance: balanceApt } as AssetRow;
                }
                // Placeholder for other Aptos coins (Move-based tokens)
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[APTOS_ADAPTER_ERROR] ${ownerAddress}:`, error.message);
            // Handle cases where account might not exist yet on-chain
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }
}

export const aptosAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'aptos') return new AptosAdapter(chain);
    return null;
};
