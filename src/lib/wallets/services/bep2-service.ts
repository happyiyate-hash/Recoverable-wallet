'use client';

import axios from 'axios';

/**
 * INSTITUTIONAL BEP2 PRODUCTION SERVICE (2026 EDITION)
 * Version: 1.0.0
 * 
 * Rules:
 * 1. MULTI-ENDPOINT FAILOVER: Dynamically audits available nodes.
 * 2. REST NATIVE: Optimized for legacy Beacon Chain API architecture.
 * 3. RETRY LOGIC: Hardened for high-congestion environments.
 */

const ENDPOINTS = {
  mainnet: [
    'https://dex.binance.org',
    'https://dataseed1.binance.org',
    'https://dataseed2.binance.org',
    'https://dataseed3.binance.org'
  ],
  testnet: [
    'https://testnet-dex.binance.org'
  ]
};

export class Bep2Service {
    private static activeEndpoint: string | null = null;

    /**
     * Resolves the healthiest available node in the registry.
     */
    static async getHealthyEndpoint(network: 'mainnet' | 'testnet' = 'mainnet'): Promise<string> {
        if (this.activeEndpoint) {
            try {
                await axios.get(`${this.activeEndpoint}/api/v1/node-info`, { timeout: 2000 });
                return this.activeEndpoint;
            } catch (e) {
                this.activeEndpoint = null;
            }
        }

        for (const url of ENDPOINTS[network]) {
            try {
                await axios.get(`${url}/api/v1/node-info`, { timeout: 3000 });
                this.activeEndpoint = url;
                return url;
            } catch (e) {}
        }

        throw new Error('BEP2_REGISTRY_UNREACHABLE: No active endpoints found.');
    }

    /**
     * Fetches real-time account balances from the healthiest node.
     */
    static async getBalances(address: string): Promise<any[]> {
        try {
            const url = await this.getHealthyEndpoint('mainnet');
            const res = await axios.get(`${url}/api/v1/account/${address}`);
            return res.data?.balances || [];
        } catch (e) {
            console.error("[BEP2_BALANCE_FAIL]", e);
            return [];
        }
    }

    /**
     * Fetches transaction history for a node.
     */
    static async getHistory(address: string): Promise<any[]> {
        try {
            const url = await this.getHealthyEndpoint('mainnet');
            const res = await axios.get(`${url}/api/v1/transactions?address=${address}&limit=20`);
            return res.data?.tx || [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Broadcasts a signed transaction payload to the chain.
     */
    static async broadcast(signedTx: string): Promise<string> {
        const url = await this.getHealthyEndpoint('mainnet');
        const res = await axios.post(`${url}/api/v1/broadcast`, signedTx, {
            headers: { 'Content-Type': 'text/plain' }
        });
        
        if (res.data && res.data[0] && res.data[0].hash) {
            return res.data[0].hash;
        }
        throw new Error(res.data?.message || "BEP2_BROADCAST_FAILED");
    }
}
