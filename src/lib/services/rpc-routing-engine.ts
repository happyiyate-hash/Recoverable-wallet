'use client';

import evmNetworks from '@/lib/evmNetworks.json';

import { ChainConfig } from '@/lib/types';

import { getAlchemyRPC } from '../wallets/alchemy_rpc_endpoints';

/**
 * ============================================================================
 * PRODUCTION RPC ROUTING ENGINE
 * Version: 2.0.0
 * ============================================================================
 *
 * FIXES:
 * - Active request load balancing
 * - Cooldown system instead of blacklist spam
 * - Rate limit protection
 * - Provider concurrency limits
 * - Smart failover
 * - Request coalescing
 * - Health recovery
 * - Mobile-safe routing
 * - Reduced RPC storms
 * ============================================================================
 */

export interface ProviderNode {
  url: string;

  type:
    | 'user'
    | 'alchemy'
    | 'infura'
    | 'public';

  /**
   * 0 → dead
   * 1 → perfect
   */
  health: number;

  /**
   * Average latency
   */
  latency: number;

  /**
   * Last failure timestamp
   */
  lastFail: number;

  /**
   * Stability tracking
   */
  consecutiveSuccess: number;

  /**
   * Cooldown instead of hard blacklist
   */
  cooldownUntil: number;

  /**
   * Active request tracking
   */
  activeRequests: number;
}

class RPCRoutingEngine {
  private static instance: RPCRoutingEngine;

  /**
   * ============================================================================
   * NODE POOLS
   * ============================================================================
   */

  private nodeRegistry =
    new Map<number, ProviderNode[]>();

  /**
   * ============================================================================
   * REQUEST DEDUPING
   * ============================================================================
   */

  private inflightSelections =
    new Map<
      string,
      Promise<ProviderNode>
    >();

  /**
   * ============================================================================
   * CONFIG
   * ============================================================================
   */

  private readonly MAX_PROVIDER_LOAD =
    2;

  private readonly RATE_LIMIT_COOLDOWN =
    10 * 60 * 1000;

  private readonly FAILURE_COOLDOWN =
    3 * 60 * 1000;

  private readonly HEALTH_RECOVERY_INTERVAL =
    30000;

  private constructor() {
    /**
     * Auto recover unhealthy nodes
     */
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.recoverNodes();
      }, this.HEALTH_RECOVERY_INTERVAL);
    }
  }

  static getInstance(): RPCRoutingEngine {
    if (!RPCRoutingEngine.instance) {
      RPCRoutingEngine.instance =
        new RPCRoutingEngine();
    }

    return RPCRoutingEngine.instance;
  }

  /**
   * ============================================================================
   * GET BEST PROVIDER
   * ============================================================================
   */

  async getBestProvider(
    chainId: number,
    infuraKey: string | null,
    alchemyKey: string | null,
    userCustomRpc?: string | null
  ): Promise<ProviderNode> {
    const requestKey = `${chainId}:${userCustomRpc || 'default'}`;

    /**
     * ============================================================================
     * REQUEST COALESCING
     * ============================================================================
     */

    if (
      this.inflightSelections.has(
        requestKey
      )
    ) {
      return this.inflightSelections.get(
        requestKey
      )!;
    }

    const selectionPromise =
      (async () => {
        const pool =
          this.getOrInitPool(
            chainId,
            infuraKey,
            alchemyKey,
            userCustomRpc
          );

        if (!pool.length) {
          throw new Error(
            `[RPC_ROUTER] No providers available for chain ${chainId}`
          );
        }

        const now = Date.now();

        /**
         * ============================================================================
         * REMOVE COOLDOWN NODES
         * ============================================================================
         */

        let candidates = pool.filter(
          node =>
            node.cooldownUntil <=
              now &&
            node.activeRequests <
              this
                .MAX_PROVIDER_LOAD
        );

        /**
         * Emergency fallback
         */

        if (!candidates.length) {
          candidates = pool.filter(
            node =>
              node.cooldownUntil <=
              now
          );
        }

        /**
         * Final emergency fallback
         */

        if (!candidates.length) {
          candidates = [...pool];
        }

        /**
         * ============================================================================
         * SMART SORTING
         * ============================================================================
         */

        const sorted =
          candidates.sort((a, b) => {
            /**
             * 1. Provider priority
             */

            const typeWeight = {
              user: 0,
              alchemy: 1,
              infura: 2,
              public: 3,
            };

            if (
              typeWeight[a.type] !==
              typeWeight[b.type]
            ) {
              return (
                typeWeight[a.type] -
                typeWeight[b.type]
              );
            }

            /**
             * 2. Health
             */

            if (
              Math.abs(
                a.health - b.health
              ) > 0.05
            ) {
              return (
                b.health - a.health
              );
            }

            /**
             * 3. Active load
             */

            if (
              a.activeRequests !==
              b.activeRequests
            ) {
              return (
                a.activeRequests -
                b.activeRequests
              );
            }

            /**
             * 4. Latency
             */

            return (
              a.latency -
              b.latency
            );
          });

        const selected =
          sorted[0];

        /**
         * Track load
         */

        selected.activeRequests++;

        return selected;
      })();

    this.inflightSelections.set(
      requestKey,
      selectionPromise
    );

    try {
      return await selectionPromise;
    } finally {
      this.inflightSelections.delete(
        requestKey
      );
    }
  }

  /**
   * ============================================================================
   * RELEASE PROVIDER
   * ============================================================================
   */

  releaseProvider(
    url: string,
    chainId: number
  ) {
    const pool =
      this.nodeRegistry.get(chainId);

    if (!pool) {
      return;
    }

    const node = pool.find(
      n => n.url === url
    );

    if (!node) {
      return;
    }

    node.activeRequests = Math.max(
      0,
      node.activeRequests - 1
    );
  }

  /**
   * ============================================================================
   * SUCCESS REPORTING
   * ============================================================================
   */

  reportSuccess(
    url: string,
    chainId: number,
    latency: number
  ) {
    const pool =
      this.nodeRegistry.get(chainId);

    if (!pool) {
      return;
    }

    const node = pool.find(
      n => n.url === url
    );

    if (!node) {
      return;
    }

    /**
     * Gentle recovery
     */

    node.health = Math.min(
      1,
      node.health + 0.03
    );

    /**
     * Rolling latency average
     */

    node.latency =
      node.latency * 0.8 +
      latency * 0.2;

    node.consecutiveSuccess++;

    /**
     * Remove cooldown after stability
     */

    if (
      node.consecutiveSuccess >= 3
    ) {
      node.cooldownUntil = 0;
    }
  }

  /**
   * ============================================================================
   * FAILURE REPORTING
   * ============================================================================
   */

  reportFailure(
    url: string,
    chainId: number,
    isRateLimit: boolean = false
  ) {
    const pool =
      this.nodeRegistry.get(chainId);

    if (!pool) {
      return;
    }

    const node = pool.find(
      n => n.url === url
    );

    if (!node) {
      return;
    }

    node.lastFail = Date.now();

    node.consecutiveSuccess = 0;

    /**
     * ============================================================================
     * RATE LIMIT HANDLING
     * ============================================================================
     */

    if (isRateLimit) {
      node.health = Math.max(
        0,
        node.health - 0.4
      );

      node.cooldownUntil =
        Date.now() +
        this
          .RATE_LIMIT_COOLDOWN;
    } else {
      node.health = Math.max(
        0,
        node.health - 0.12
      );

      node.cooldownUntil =
        Date.now() +
        this.FAILURE_COOLDOWN;
    }
  }

  /**
   * ============================================================================
   * RECOVER UNHEALTHY NODES
   * ============================================================================
   */

  private recoverNodes() {
    const now = Date.now();

    for (const pool of this.nodeRegistry.values()) {
      for (const node of pool) {
        /**
         * Cooldown expired
         */

        if (
          node.cooldownUntil > 0 &&
          node.cooldownUntil <= now
        ) {
          node.cooldownUntil = 0;
        }

        /**
         * Slowly restore health
         */

        if (
          node.health < 1 &&
          now - node.lastFail >
            60000
        ) {
          node.health = Math.min(
            1,
            node.health + 0.02
          );
        }

        /**
         * Reset bad latency slowly
         */

        if (node.latency > 150) {
          node.latency =
            node.latency * 0.98;
        }
      }
    }
  }

  /**
   * ============================================================================
   * CREATE OR LOAD POOL
   * ============================================================================
   */

  private getOrInitPool(
    chainId: number,
    infuraKey: string | null,
    alchemyKey: string | null,
    userCustomRpc?: string | null
  ): ProviderNode[] {
    const existing =
      this.nodeRegistry.get(chainId);

    if (existing) {
      return existing;
    }

    const pool: ProviderNode[] = [];

    const chain =
      (
        evmNetworks as Record<
          string,
          ChainConfig
        >
      )[chainId.toString()];

    if (!chain) {
      return [];
    }

    /**
     * ============================================================================
     * USER CUSTOM RPC
     * ============================================================================
     */

    if (userCustomRpc) {
      pool.push(
        this.createNode(
          userCustomRpc,
          'user'
        )
      );
    }

    /**
     * ============================================================================
     * ALCHEMY
     * ============================================================================
     */

    if (alchemyKey) {
      const alchemyUrl =
        getAlchemyRPC(
          chain.name.toLowerCase() as any,
          alchemyKey
        );

      if (alchemyUrl) {
        pool.push(
          this.createNode(
            alchemyUrl,
            'alchemy'
          )
        );
      }
    }

    /**
     * ============================================================================
     * INFURA
     * ============================================================================
     */

    if (
      infuraKey &&
      chain.rpcUrl.includes(
        'infura.io'
      )
    ) {
      const infuraUrl =
        chain.rpcUrl.replace(
          '{API_KEY}',
          infuraKey
        );

      pool.push(
        this.createNode(
          infuraUrl,
          'infura'
        )
      );
    }

    /**
     * ============================================================================
     * PUBLIC RPCS
     * ============================================================================
     */

    const publicNodes: Record<
      number,
      string[]
    > = {
      1: [
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
        'https://cloudflare-eth.com',
      ],

      137: [
        'https://polygon-rpc.com',
        'https://polygon.llamarpc.com',
      ],

      8453: [
        'https://mainnet.base.org',
        'https://base.llamarpc.com',
      ],

      42161: [
        'https://arb1.arbitrum.io/rpc',
        'https://arbitrum.llamarpc.com',
      ],

      10: [
        'https://mainnet.optimism.io',
        'https://optimism.llamarpc.com',
      ],

      56: [
        'https://bsc-dataseed.binance.org',
        'https://binance.llamarpc.com',
      ],
    };

    if (publicNodes[chainId]) {
      publicNodes[
        chainId
      ].forEach(url => {
        pool.push(
          this.createNode(
            url,
            'public'
          )
        );
      });
    }

    /**
     * ============================================================================
     * DEFAULT REGISTRY RPC
     * ============================================================================
     */

    const defaultUrl =
      chain.rpcUrl.replace(
        '{API_KEY}',
        infuraKey || ''
      );

    if (
      !pool.find(
        p => p.url === defaultUrl
      )
    ) {
      pool.push(
        this.createNode(
          defaultUrl,
          'public'
        )
      );
    }

    this.nodeRegistry.set(
      chainId,
      pool
    );

    return pool;
  }

  /**
   * ============================================================================
   * CREATE NODE
   * ============================================================================
   */

  private createNode(
    url: string,
    type: ProviderNode['type']
  ): ProviderNode {
    return {
      url,

      type,

      health: 1,

      latency: 150,

      lastFail: 0,

      consecutiveSuccess: 0,

      cooldownUntil: 0,

      activeRequests: 0,
    };
  }
}

export const rpcRoutingEngine =
  RPCRoutingEngine.getInstance();