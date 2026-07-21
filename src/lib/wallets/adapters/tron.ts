
'use client';

import { TronWeb } from "tronweb";
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * TRON Protocol Adapter
 * Handles real-time balance discovery via the TRON Grid API.
 * Version: 2.0.0 (Security Scan Engine Integrated)
 */
class TronAdapter implements IWalletAdapter {
    private tronWeb: any;

    constructor(chain: ChainConfig) {
        this.tronWeb = new TronWeb({
            fullHost: chain.rpcUrl || "https://api.trongrid.io"
        });
    }

    /**
     * SECURE SCAN ENGINE: Permission Audit
     * Checks if a TRON account has custom permissions or multi-sig traps.
     */
    async checkAccountSecurity(address: string) {
        try {
            const account = await this.tronWeb.trx.getAccount(address);
            
            if (!account || !account.owner_permission) {
                return { isCustom: false, isRisk: false };
            }

            const ownerKeys = account.owner_permission.keys || [];
            const ownerThreshold = account.owner_permission.threshold || 1;
            
            const activePermissions = account.active_permission || [];
            const hasMultipleActives = activePermissions.length > 1;
            
            // LOGIC GATE: Threshold > 1 or multiple keys indicates a possible trap if not set by user
            const isCustom = ownerKeys.length > 1 || ownerThreshold > 1 || hasMultipleActives;
            
            return {
                isCustom,
                isRisk: isCustom, // Flag as risk for the UI to handle triage
                ownerThreshold,
                keyCount: ownerKeys.length,
                details: {
                    owner: account.owner_permission,
                    active: account.active_permission
                }
            };
        } catch (error) {
            console.warn(`[TRX_SECURITY_SCAN_FAIL] ${address}:`, error);
            return { isCustom: false, isRisk: false };
        }
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        try {
            // Fetch native TRX balance (unit: Sun)
            const balanceSun = await this.tronWeb.trx.getBalance(ownerAddress);
            const balanceTrx = (balanceSun / 1_000_000).toString();

            return assets.map(asset => {
                if (asset.symbol === 'TRX') {
                    return { ...asset, balance: balanceTrx } as AssetRow;
                }
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[TRX_ADAPTER_ERROR] ${ownerAddress}:`, error.message);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }
}

export const tronAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'tron') return new TronAdapter(chain);
    return null;
};
