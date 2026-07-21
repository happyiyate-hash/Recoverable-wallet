
'use client';

import * as bitcoin from "bitcoinjs-lib";
import axios from "axios";
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * Litecoin Mainnet Parameters
 * Standard configuration for LTC bech32 and WIF protocols.
 */
export const litecoinNetwork: bitcoin.Network = {
  messagePrefix: "\x19Litecoin Signed Message:\n",
  bech32: "ltc",
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe,
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

class LitecoinAdapter implements IWalletAdapter {
    private apiUrl: string;

    constructor(chain: ChainConfig) {
        this.apiUrl = chain.rpcUrl; 
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        try {
            // Institutional Timeout Node: 15s hard limit
            const url = `${this.apiUrl}/api/address/${ownerAddress}/utxo`;
            const { data } = await axios.get(url, { timeout: 15000 });
            
            if (!Array.isArray(data)) throw new Error("INVALID_UTXO_RESPONSE");

            const totalSats = data.reduce((sum: number, utxo: any) => sum + (utxo.value || 0), 0);
            const balanceLtc = (totalSats / 100_000_000).toString();

            return assets.map(asset => {
                if (asset.symbol === 'LTC') {
                    return { ...asset, balance: balanceLtc } as AssetRow;
                }
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[LTC_ADAPTER_FAIL] ${ownerAddress} (Timeout/RPC):`, error.message);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }
}

export const litecoinAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'ltc') return new LitecoinAdapter(chain);
    return null;
};
