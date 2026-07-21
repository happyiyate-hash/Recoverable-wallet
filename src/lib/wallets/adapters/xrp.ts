'use client';

import * as xrpl from 'xrpl';
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * XRP Ledger Adapter
 * Version: 3.0.0 (Forensic Security Audit Integrated)
 */
class XrpAdapter implements IWalletAdapter {
    private rpcUrl: string;

    constructor(chain: ChainConfig) {
        this.rpcUrl = chain.rpcUrl;
    }

    /**
     * SECURE SCAN ENGINE: XRPL Permission Audit
     * Detects if the Master Key is disabled or if a Regular/Multisig key is required.
     */
    async checkAccountSecurity(address: string) {
        const client = new xrpl.Client(this.rpcUrl);
        try {
            await Promise.race([
                client.connect(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('XRPL_TIMEOUT')), 5000))
            ]);

            const response = await client.request({
                command: "account_info",
                account: address,
                ledger_index: "validated"
            });

            const accountData = response.result.account_data;
            const flags = accountData.Flags || 0;

            // lsfDisableMaster = 0x00100000 (1048576)
            const isMasterDisabled = Boolean(flags & 0x00100000);
            const hasRegularKey = Boolean(accountData.RegularKey);

            // Check for SignerList (Multisig)
            const objectsRes = await client.request({
                command: "account_objects",
                account: address,
                type: "signer_list"
            });
            const hasSignerList = objectsRes.result.account_objects.length > 0;

            return {
                isRisk: isMasterDisabled || hasRegularKey || hasSignerList,
                isMasterDisabled,
                hasRegularKey,
                hasSignerList,
                details: {
                    regularKey: accountData.RegularKey,
                    signerListCount: objectsRes.result.account_objects.length
                }
            };
        } catch (error) {
            return { isRisk: false };
        } finally {
            if (client.isConnected()) await client.disconnect();
        }
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        const client = new xrpl.Client(this.rpcUrl);
        
        try {
            await Promise.race([
                client.connect(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('XRPL_CONNECTION_TIMEOUT')), 8000))
            ]);

            const response = await client.request({
                command: "account_info",
                account: ownerAddress,
                ledger_index: "validated"
            });

            const balanceDrops = response.result.account_data.Balance;
            const balanceXrp = xrpl.dropsToXrp(balanceDrops);

            return assets.map(asset => {
                if (asset.symbol === 'XRP') {
                    return { ...asset, balance: balanceXrp } as AssetRow;
                }
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            if (error.data?.error === 'actNotFound' || error.message?.includes('Account not found')) {
                return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
            }
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        } finally {
            if (client.isConnected()) await client.disconnect();
        }
    }
}

export const xrpAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'xrp') return new XrpAdapter(chain);
    return null;
};
