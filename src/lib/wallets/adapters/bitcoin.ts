
'use client';

import axios from 'axios';
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * Bitcoin (BTC) Adapter
 * Version: 2.0.0 (Forensic Audit Node)
 * 
 * Fetches balances and audits security parameters from Blockstream's API.
 */
class BitcoinAdapter implements IWalletAdapter {
    private apiUrl: string;

    constructor(chain: ChainConfig) {
        this.apiUrl = chain.rpcUrl; 
    }

    /**
     * SECURE SCAN ENGINE: BTC Specification Audit
     */
    async checkAccountSecurity(address: string) {
        try {
            // 1. Detect Registry Format (Address Type)
            let type = "Unknown";
            if (address.startsWith('1')) type = "Legacy (P2PKH)";
            else if (address.startsWith('3')) type = "SegWit (P2SH)";
            else if (address.startsWith('bc1q')) type = "Native SegWit (Bech32)";
            else if (address.startsWith('bc1p')) type = "Taproot (P2TR)";

            // 2. Mempool Handshake (Pending Funds)
            const response = await axios.get(`${this.apiUrl}/address/${address}`, { timeout: 10000 });
            const mempool = response.data.mempool_stats;
            const pendingAmount = (mempool.funded_txo_sum - mempool.spent_txo_sum) / 100_000_000;

            return {
                walletType: type,
                signingMode: "Single Key", // Default for terminal-generated nodes
                pendingFunds: pendingAmount,
                isWatchOnly: false, // Updated by provider if no privKey
                securityScore: type.includes('Native') || type.includes('Taproot') ? 'Strong' : 'Standard'
            };
        } catch (error) {
            return { walletType: "Scanning...", signingMode: "Unknown", pendingFunds: 0, securityScore: "---" };
        }
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        try {
            const response = await axios.get(`${this.apiUrl}/address/${ownerAddress}`, {
                timeout: 15000 
            });
            
            const { funded_txo_sum, spent_txo_sum } = response.data.chain_stats;
            const balanceBtc = ((funded_txo_sum - spent_txo_sum) / 100_000_000).toString();

            return assets.map(asset => {
                if (asset.symbol === 'BTC') {
                    return { ...asset, balance: balanceBtc } as AssetRow;
                }
                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[BTC_ADAPTER_FAIL] ${ownerAddress}:`, error.message);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }
}

export const bitcoinAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'btc') return new BitcoinAdapter(chain);
    return null;
};
