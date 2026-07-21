'use client';

import axios from 'axios';
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * Bitcoin Cash (BCH) Adapter
 * Version: 1.0.0 (Blockchair/UTXO Standard)
 */
class BitcoinCashAdapter implements IWalletAdapter {
    private apiUrl: string;

    constructor(chain: ChainConfig) {
        // Blockchair dashboard endpoint for high-speed resolution
        this.apiUrl = "https://api.blockchair.com/bitcoin-cash/dashboards/address";
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        try {
            // Institutional Handshake: Blockchair REST Node
            const response = await axios.get(`${this.apiUrl}/${ownerAddress}`, {
                timeout: 12000 
            });
            
            const data = response.data.data[ownerAddress];
            if (!data) throw new Error("NODE_NOT_FOUND");

            // 1 BCH = 100,000,000 satoshis
            const balanceBch = (data.address.balance / 100_000_000).toString();

            return assets.map(asset => {
                if (asset.symbol === 'BCH') {
                    return { ...asset, balance: balanceBch } as AssetRow;
                }
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[BCH_ADAPTER_FAIL] ${ownerAddress}:`, error.message);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }
}

export const bitcoinCashAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'bitcoin-cash') return new BitcoinCashAdapter(chain);
    return null;
};
