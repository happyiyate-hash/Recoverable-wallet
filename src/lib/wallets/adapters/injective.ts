
'use client';

import {
  DirectSecp256k1HdWallet,
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
 * Injective (INJ) Adapter
 * Real-time balance fetching via Injective Tendermint RPC.
 */
class InjectiveAdapter implements IWalletAdapter {
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
            const balance = await client.getBalance(ownerAddress, "uinj");
            
            // 1 INJ = 10^18 uinj
            const balanceInj = (Number(BigInt(balance.amount)) / 1_000_000_000_000_000_000).toString();

            return assets.map(asset => {
                if (asset.symbol === 'INJ') {
                    return { ...asset, balance: balanceInj } as AssetRow;
                }
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[INJECTIVE_ADAPTER_ERROR] ${this.rpcUrl}:`, error.message);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }

    // HD DERIVATION ENGINE
    async deriveFromMnemonic(mnemonic: string, index = 0) {
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
            prefix: "inj",
            hdPaths: [stringToPath(`m/44'/60'/0'/0/${index}`)]
        });

        const [account] = await wallet.getAccounts();

        return {
            mnemonic,
            address: account.address,
            path: `m/44'/60'/0'/0/${index}`,
        };
    }
}

export const injectiveAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.name.toLowerCase().includes('injective')) return new InjectiveAdapter(chain);
    return null;
};
