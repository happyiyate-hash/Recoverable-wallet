
'use client';

import { ApiPromise, WsProvider } from '@polkadot/api';
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * POLKADOT (DOT) ADAPTER - HARDENED VERSION
 * Version: 4.6.0 (Resilient Socket Lifecycle)
 * 
 * Implements strict provider-ready checks before API initialization
 * to prevent "WebSocket is not connected" fatal errors.
 */

const DOT_ENDPOINTS = [
    "wss://rpc.polkadot.io",
    "wss://polkadot.api.onfinality.io/public-ws",
    "wss://dot.api.capy.node",
    "wss://polkadot-rpc.publicnode.com"
];

class PolkadotAdapter implements IWalletAdapter {
    private chain: ChainConfig;

    constructor(chain: ChainConfig) {
        this.chain = chain;
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        const endpoints = [this.chain.rpcUrl, ...DOT_ENDPOINTS.filter(e => e !== this.chain.rpcUrl)];
        
        for (const url of endpoints) {
            let api: ApiPromise | null = null;
            let provider: WsProvider | null = null;

            try {
                // 1. Establish Provider
                provider = new WsProvider(url); 
                
                // 2. WAIT FOR PROVIDER READY (Critical Fix)
                // This ensures the socket is OPEN before ApiPromise tries to getMetadata
                await Promise.race([
                    provider.isReady,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('WS_CONNECT_TIMEOUT')), 8000))
                ]);

                // 3. Initialize API
                api = await Promise.race([
                    ApiPromise.create({ 
                        provider,
                        throwOnConnect: true,
                        noInitWarn: true 
                    }),
                    new Promise<null>((_, reject) => 
                        setTimeout(() => reject(new Error('POLKADOT_INIT_TIMEOUT')), 12000)
                    )
                ]) as ApiPromise;

                if (!api) throw new Error("INIT_FAILED");

                // 4. Final Readiness Check
                await api.isReadyOrError;

                const { data: balance } = await api.query.system.account(ownerAddress) as any;
                
                // 1 DOT = 10^10 planck
                const freeBalance = balance.free.toBigInt();
                const balanceDot = Number(freeBalance) / 10_000_000_000;

                return assets.map(asset => {
                    if (asset.symbol === 'DOT') {
                        return { ...asset, balance: balanceDot.toString() } as AssetRow;
                    }
                    return { ...asset, balance: '0' } as AssetRow;
                });

            } catch (error: any) {
                // Silencing the expected noise from "Normal Closure" events during workstation handshakes
                if (!error.message?.includes('Normal Closure')) {
                    console.warn(`[DOT_ADAPTER_ADVISORY] Endpoint ${url} deferred:`, error.message);
                }
                continue; // Try next endpoint
            } finally {
                // 5. Clean Lifecycle termination
                try {
                    if (api) await api.disconnect();
                    if (provider) await provider.disconnect();
                } catch (e) {}
            }
        }

        // Return zeros if all endpoints fail
        return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
    }
}

export const polkadotAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'polkadot') return new PolkadotAdapter(chain);
    return null;
};
