'use client';

import evmNetworks from '@/lib/evmNetworks.json';
import { ChainConfig } from '@/lib/types';
import { getAlchemyRPC } from '../wallets/alchemy_rpc_endpoints';

/**
 * INSTITUTIONAL RPC REGISTRY (v2.0.0)
 * Logic: Provider Pooling, Weighting, and Failover.
 */

export interface RPCProvider {
  url: string;
  type: 'alchemy' | 'infura' | 'public';
  priority: number;
}

class RPCRegistry {
  private static instance: RPCRegistry;
  
  private constructor() {}

  static getInstance(): RPCRegistry {
    if (!RPCRegistry.instance) {
      RPCRegistry.instance = new RPCRegistry();
    }
    return RPCRegistry.instance;
  }

  /**
   * Returns a prioritized pool of RPC endpoints for a given chain.
   */
  getProviderPool(chainId: number, infuraKey: string | null, alchemyKey: string | null): RPCProvider[] {
    const pool: RPCProvider[] = [];
    const chain = (evmNetworks as Record<string, ChainConfig>)[chainId.toString()];
    
    if (!chain) return [];

    // 1. Alchemy (High Priority if key exists)
    if (alchemyKey) {
      const alchemyUrl = getAlchemyRPC(chain.name.toLowerCase() as any, alchemyKey);
      if (alchemyUrl) {
        pool.push({ url: alchemyUrl, type: 'alchemy', priority: 0 });
      }
    }

    // 2. Infura (Medium Priority)
    if (infuraKey && chain.rpcUrl.includes('infura.io')) {
      const infuraUrl = chain.rpcUrl.replace('{API_KEY}', infuraKey);
      pool.push({ url: infuraUrl, type: 'infura', priority: 1 });
    }

    // 3. Public RPC (Fallback)
    // We add some common public RPCs for major chains
    const publicFallbacks: Record<number, string[]> = {
      1: ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth'],
      137: ['https://polygon-rpc.com', 'https://rpc-mainnet.matic.network'],
      8453: ['https://mainnet.base.org'],
      42161: ['https://arb1.arbitrum.io/rpc'],
      10: ['https://mainnet.optimism.io'],
      56: ['https://bsc-dataseed.binance.org'],
    };

    if (publicFallbacks[chainId]) {
      publicFallbacks[chainId].forEach(url => {
        pool.push({ url, type: 'public', priority: 2 });
      });
    }

    // Add default from config if not already in pool
    if (!pool.find(p => p.url === chain.rpcUrl)) {
        pool.push({ url: chain.rpcUrl.replace('{API_KEY}', infuraKey || ''), type: 'public', priority: 3 });
    }

    return pool.sort((a, b) => a.priority - b.priority);
  }
}

export const rpcRegistry = RPCRegistry.getInstance();
