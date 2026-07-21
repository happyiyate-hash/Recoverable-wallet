
'use client';

import * as bitcoin from "bitcoinjs-lib";
import axios from "axios";
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * Dogecoin Mainnet Parameters
 * standard configuration for DOGE p2pkh protocols.
 */
export const dogecoinNetwork: bitcoin.Network = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: '',
  bip32: {
    public: 0x02facafd,
    private: 0x02fac398,
  },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e,
};

class DogecoinAdapter implements IWalletAdapter {
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
            const url = `${this.apiUrl}/address/${ownerAddress}/utxo`;
            const { data } = await axios.get(url, { timeout: 15000 });
            
            if (!Array.isArray(data)) throw new Error("INVALID_UTXO_RESPONSE");

            const totalSats = data.reduce((sum: number, utxo: any) => sum + (utxo.value || 0), 0);
            const balanceDoge = (totalSats / 100_000_000).toString();

            return assets.map(asset => {
                if (asset.symbol === 'DOGE') {
                    return { ...asset, balance: balanceDoge } as AssetRow;
                }
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[DOGE_ADAPTER_FAIL] ${ownerAddress} (Timeout/RPC):`, error.message);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }
}

export const dogecoinAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'doge') return new DogecoinAdapter(chain);
    return null;
};
