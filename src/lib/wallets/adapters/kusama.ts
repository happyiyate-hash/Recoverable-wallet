
'use client';

import { ApiPromise, WsProvider } from '@polkadot/api';
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * KUSAMA (KSM) ADAPTER - HARDENED VERSION
 * Version: 4.6.0 (Resilient Socket Lifecycle)
 */

const KSM_ENDPOINTS = [
    "wss://kusama-rpc.polkadot.io",
    "wss://kusama.api.onfinality.io/public-ws",
    "wss://rpc.ibp.network/kusama",
    "wss://ksm-rpc.polkadot.io"
];

class KusamaAdapter implements IWalletAdapter {
    private chain: ChainConfig;

    constructor(chain: ChainConfig) {
        this.chain = chain;
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        const endpoints = [this.chain.rpcUrl, ...KSM_ENDPOINTS.filter(e => e !== this.chain.rpcUrl)];

        for (const url of endpoints) {
            let api: ApiPromise | null = null;
            let provider: WsProvider | null = null;

            try {
                // 1. Establish Provider
                provider = new WsProvider(url); 
                
                // 2. WAIT FOR PROVIDER READY (Critical Fix)
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
                        setTimeout(() => reject(new Error('KUSAMA_INIT_TIMEOUT')), 12000)
                    )
                ]) as ApiPromise;

                if (!api) throw new Error("INIT_FAILED");

                // 4. Final Readiness Check
                await api.isReadyOrError;

                const { data: balance } = await api.query.system.account(ownerAddress) as any;
                
                // 1 KSM = 10^12 planck
                const freeBalance = balance.free.toBigInt();
                const balanceKsm = Number(freeBalance) / 1_000_000_000_000;

                return assets.map(asset => {
                    if (asset.symbol === 'KSM') {
                        return { ...asset, balance: balanceKsm.toString() } as AssetRow;
                    }
                    return { ...asset, balance: '0' } as AssetRow;
                });

            } catch (error: any) {
                if (!error.message?.includes('Normal Closure')) {
                    console.warn(`[KSM_ADAPTER_ADVISORY] Endpoint ${url} deferred:`, error.message);
                }
                continue;
            } finally {
                // 5. Clean Lifecycle termination
                try {
                    if (api) await api.disconnect();
                    if (provider) await provider.disconnect();
                } catch (e) {}
            }
        }

        return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
    }
}

export const kusamaAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'kusama') return new KusamaAdapter(chain);
    return null;
};
