
'use client';

import {
  DirectSecp256k1HdWallet
} from "@cosmjs/proto-signing";
import {
  SigningStargateClient,
  StargateClient,
  GasPrice,
  calculateFee,
} from "@cosmjs/stargate";
import { stringToPath } from "@cosmjs/crypto";
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * Celestia (TIA) Adapter
 * Real-time balance fetching via Celestia Tendermint RPC.
 */
class CelestiaAdapter implements IWalletAdapter {
    private rpcUrl: string;

    constructor(chain: ChainConfig) {
        this.rpcUrl = chain.rpcUrl;
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        try {
            const client = await StargateClient.connect(this.rpcUrl);
            const balance = await client.getBalance(ownerAddress, "utia");
            
            // 1 TIA = 1,000,000 utia
            const balanceTia = (Number(balance.amount) / 1_000_000).toString();

            return assets.map(asset => {
                if (asset.symbol === 'TIA') {
                    return { ...asset, balance: balanceTia } as AssetRow;
                }
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[CELESTIA_ADAPTER_ERROR] ${this.rpcUrl}:`, error.message);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }

    // HD DERIVATION ENGINE
    async deriveFromMnemonic(mnemonic: string, index = 0) {
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
            prefix: "celestia",
            hdPaths: [stringToPath(`m/44'/118'/0'/0/${index}`)]
        });

        const [account] = await wallet.getAccounts();

        return {
            mnemonic,
            address: account.address,
            path: `m/44'/118'/0'/0/${index}`,
        };
    }
}

export const celestiaAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'celestia') return new CelestiaAdapter(chain);
    return null;
};
