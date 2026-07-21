
'use client';

import {
  Client,
  AccountId,
  AccountBalanceQuery,
} from "@hashgraph/sdk";
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * Hedera (HBAR) Adapter
 * Handles real-time balance discovery via the Hedera Mirror Node.
 */
class HederaAdapter implements IWalletAdapter {
    private client: Client;

    constructor(chain: ChainConfig) {
        // Institutional access via Mirror Node
        this.client = chain.name.toLowerCase().includes('testnet') 
            ? Client.forTestnet() 
            : Client.forMainnet();
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        // ownerAddress for Hedera is expected to be the Account ID (0.0.xxxxx)
        if (!ownerAddress || !ownerAddress.includes('.')) {
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }

        try {
            const accountId = AccountId.fromString(ownerAddress);
            const balance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(this.client);
            
            // 1 HBAR = 100,000,000 tinybars
            const balanceHbar = (balance.hbars.toTinybars().toNumber() / 100_000_000).toString();

            return assets.map(asset => {
                if (asset.symbol === 'HBAR') {
                    return { ...asset, balance: balanceHbar } as AssetRow;
                }
                // Placeholder for HTS tokens (Hedera Token Service)
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[HEDERA_ADAPTER_ERROR] ${ownerAddress}:`, error.message);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }
}

export const hederaAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'hedera') return new HederaAdapter(chain);
    return null;
};
