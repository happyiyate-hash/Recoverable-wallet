'use client';

import {
  createPublicClient,
  http,
  parseAbi,
  formatUnits,
} from 'viem';

import {
  mainnet,
  polygon,
  base,
  arbitrum,
  optimism,
  bsc,
} from 'viem/chains';

import { rpcRoutingEngine } from './rpc-routing-engine';
import { cacheEngine } from './cache-engine';
import { systemEmitter } from '@/lib/events/systemEmitter';
import { TelemetryEventType } from '@/lib/telemetry/event-types';


import type {
  AssetRow,
  ChainConfig,
  WalletWithMetadata,
} from '@/lib/types';

/**
 * ============================================================================
 * PRODUCTION BALANCE ENGINE
 * Version: 4.0.0
 * ============================================================================
 *
 * FIXES:
 * - Chain sleep/wake system
 * - Transaction pause mode
 * - Visibility-aware fetching
 * - Reduced token explosion
 * - Background-safe refresh
 * - Smart caching
 * - Request deduplication
 * - Sequential queueing
 * - UI-safe yielding
 * - Reduced rerenders
 * - Mobile-safe execution
 * - Rate limit protection
 * ============================================================================
 */

const VIEM_CHAINS: Record<number, any> = {
  1: mainnet,
  137: polygon,
  8453: base,
  42161: arbitrum,
  10: optimism,
  56: bsc,
};

const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
]);

type ChainState =
  | 'HOT'
  | 'WARM'
  | 'COLD'
  | 'SLEEPING';

class BalanceEngine {
  private static instance: BalanceEngine;

  /**
   * ============================================================================
   * REQUEST DEDUPLICATION
   * ============================================================================
   */

  private inflightRequests =
    new Map<string, Promise<AssetRow[]>>();

  /**
   * ============================================================================
   * MEMORY CACHE
   * ============================================================================
   */

  private memoryCache = new Map<
    string,
    {
      data: AssetRow[];
      timestamp: number;
    }
  >();

  /**
   * ============================================================================
   * CHAIN STATES
   * ============================================================================
   */

  private chainStates =
    new Map<number, ChainState>();

  /**
   * ============================================================================
   * TRANSACTION MODE
   * ============================================================================
   */

  private transactionMode = false;

  /**
   * ============================================================================
   * GLOBAL CONCURRENCY
   * ============================================================================
   */

  private activeRequests = 0;

  private readonly MAX_CONCURRENT_REQUESTS = 1;

  /**
   * ============================================================================
   * CONFIG
   * ============================================================================
   */

  private readonly MULTICALL_CHUNK_SIZE = 15;

  private readonly RPC_TIMEOUT = 12000;

  private readonly MEMORY_CACHE_TTL = 15000;

  private readonly PERSISTENT_CACHE_TTL = 300000;

  private readonly HOT_CHAIN_DELAY = 150;

  private readonly BACKGROUND_DELAY = 15000;

  private constructor() {
    /**
     * Visibility awareness
     */
    if (typeof document !== 'undefined') {
      document.addEventListener(
        'visibilitychange',
        this.handleVisibilityChange
      );
    }
  }

  static getInstance(): BalanceEngine {
    if (!BalanceEngine.instance) {
      BalanceEngine.instance =
        new BalanceEngine();
    }

    return BalanceEngine.instance;
  }

  /**
   * ============================================================================
   * VISIBILITY HANDLER
   * ============================================================================
   */

  private handleVisibilityChange = () => {
    if (document.hidden) {
      console.log(
        '[BALANCE_ENGINE] App hidden'
      );
    } else {
      console.log(
        '[BALANCE_ENGINE] App visible'
      );
    }
  };

  /**
   * ============================================================================
   * TRANSACTION MODE
   * ============================================================================
   */

  startTransactionMode() {
    this.transactionMode = true;
  }

  stopTransactionMode() {
    this.transactionMode = false;
  }

  invalidateCache(key: string) {
    this.memoryCache.delete(key);
    console.log(`[BALANCE_ENGINE] Memory cache invalidated: ${key}`);
  }


  /**
   * ============================================================================
   * CHAIN PRIORITY CONTROL
   * ============================================================================
   */

  wakeChain(
    chainId: number,
    state: ChainState = 'HOT'
  ) {
    this.chainStates.set(chainId, state);
  }

  sleepChain(chainId: number) {
    this.chainStates.set(
      chainId,
      'SLEEPING'
    );
  }

  getChainState(
    chainId: number
  ): ChainState {
    return (
      this.chainStates.get(chainId) ||
      'SLEEPING'
    );
  }

  /**
   * ============================================================================
   * FETCH ACTIVE CHAIN ONLY
   * ============================================================================
   */

  async fetchActiveChain(
    chain: ChainConfig,
    wallets: WalletWithMetadata[],
    infuraKey: string | null,
    alchemyKey: string | null
  ) {
    this.wakeChain(chain.chainId, 'HOT');

    return this.fetchChainBalances(
      chain,
      wallets,
      infuraKey,
      alchemyKey
    );
  }

  /**
   * ============================================================================
   * BACKGROUND REFRESH
   * ============================================================================
   */

  async backgroundRefresh(
    chains: ChainConfig[],
    wallets: WalletWithMetadata[],
    infuraKey: string | null,
    alchemyKey: string | null
  ) {
    if (this.transactionMode) {
      return;
    }

    if (
      typeof document !== 'undefined' &&
      document.hidden
    ) {
      return;
    }

    for (const chain of chains) {
      if (this.transactionMode) {
        return;
      }

      const state = this.getChainState(
        chain.chainId
      );

      /**
       * Skip sleeping chains
       */
      if (state === 'SLEEPING') {
        continue;
      }

      /**
       * Skip hot chains
       * They are refreshed elsewhere
       */
      if (state === 'HOT') {
        continue;
      }

      try {
        await this.fetchChainBalances(
          chain,
          wallets,
          infuraKey,
          alchemyKey
        );
      } catch (error) {
        console.warn(
          `[BALANCE_ENGINE] Background refresh failed`,
          error
        );
      }

      /**
       * VERY IMPORTANT
       * Slow background refresh
       */
      await this.sleep(
        this.BACKGROUND_DELAY
      );

      await this.yieldThread();
    }
  }

  /**
   * ============================================================================
   * FETCH CHAIN BALANCES
   * ============================================================================
   */

  async fetchChainBalances(
    chain: ChainConfig,
    wallets: WalletWithMetadata[],
    infuraKey: string | null,
    alchemyKey: string | null
  ): Promise<AssetRow[]> {
    /**
     * During signing/sending
     * NEVER spam RPC
     */
    if (this.transactionMode) {
      const wallet = wallets.find(
        w =>
          w.type ===
          (chain.type || 'evm')
      );

      if (!wallet) {
        return [];
      }

      const cacheKey = `balances:${chain.chainId}:${wallet.address.toLowerCase()}`;

      const cached =
        this.memoryCache.get(cacheKey);

      if (cached) {
        return cached.data;
      }

      return [];
    }

    const wallet = wallets.find(
      w => w.type === (chain.type || 'evm')
    );

    if (!wallet) {
      return [];
    }

    const cacheKey = `balances:${chain.chainId}:${wallet.address.toLowerCase()}`;

    /**
     * ============================================================================
     * MEMORY CACHE
     * ============================================================================
     */

    const memCached =
      this.memoryCache.get(cacheKey);

    if (
      memCached &&
      Date.now() - memCached.timestamp <
      this.MEMORY_CACHE_TTL
    ) {
      try {
        systemEmitter.emit('BALANCE_FETCH_CACHE_HIT', {
          chainId: chain.chainId,
          address: wallet.address,
          timestamp: Date.now()
        });
      } catch (e) {}
      return memCached.data;
    }

    /**
     * ============================================================================
     * REQUEST COALESCING
     * ============================================================================
     */

    if (
      this.inflightRequests.has(cacheKey)
    ) {
      try {
        systemEmitter.emit('BALANCE_FETCH_COALESCED', {
          chainId: chain.chainId,
          address: wallet.address,
          timestamp: Date.now()
        });
      } catch (e) {}
      return this.inflightRequests.get(
        cacheKey
      )!;
    }


    const requestPromise = (async () => {
      try {
        let balances: AssetRow[] = [];

        if (
          chain.type === 'evm' ||
          !chain.type
        ) {
          balances =
            await this.fetchEVMBalances(
              chain,
              wallet.address,
              infuraKey,
              alchemyKey
            );
        } else {
          const {
            fetchBalancesForChain,
          } = await import(
            '@/lib/wallets/services/balance-service'
          );

          balances =
            await fetchBalancesForChain(
              chain,
              wallets,
              infuraKey,
              alchemyKey,
              []
            );
        }

        /**
         * ============================================================================
         * CACHE UPDATE
         * ============================================================================
         */

        this.memoryCache.set(cacheKey, {
          data: balances,
          timestamp: Date.now(),
        });

        cacheEngine
          .set(
            cacheKey,
            balances,
            this.PERSISTENT_CACHE_TTL
          )
          .catch(console.error);

        return balances;
      } finally {
        this.inflightRequests.delete(
          cacheKey
        );
      }
    })();

    this.inflightRequests.set(
      cacheKey,
      requestPromise
    );

    return requestPromise;
  }

  /**
   * ============================================================================
   * EVM FETCHER
   * ============================================================================
   */

  private async fetchEVMBalances(
    chain: ChainConfig,
    address: string,
    infuraKey: string | null,
    alchemyKey: string | null
  ): Promise<AssetRow[]> {
    const { getInitialAssets } =
      await import(
        '@/lib/wallets/balances'
      );

    /**
     * ============================================================================
     * MASSIVE FIX:
     * REDUCE TOKEN EXPLOSION
     * ============================================================================
     */

    const assets = getInitialAssets(
      chain.chainId
    )
      .filter(Boolean)

      /**
       * CRITICAL FIX
       * DO NOT LOAD 250 TOKENS
       */
      .slice(0, 40);

    const nativeAsset = assets.find(
      a => a.isNative
    );

    const erc20s = assets.filter(
      a =>
        !a.isNative &&
        a.address &&
        a.address !== '0x'
    );

    let attempt = 0;

    while (attempt < 3) {
      await this.acquireSlot();

      const provider =
        await rpcRoutingEngine.getBestProvider(
          chain.chainId,
          infuraKey,
          alchemyKey
        );

      const startTime =
        performance.now();

      try {
        const client =
          createPublicClient({
            chain:
              VIEM_CHAINS[
              chain.chainId
              ] || mainnet,

            transport: http(provider.url),

            batch: {
              multicall: false,
            },
          });

        /**
         * ============================================================================
         * STEP 1:
         * NATIVE BALANCE FIRST
         * ============================================================================
         */

        let nativeBalance = 0n;

        if (nativeAsset) {
          nativeBalance =
            await this.withTimeout(
              client.getBalance({
                address:
                  address as `0x${string}`,
              }),
              this.RPC_TIMEOUT
            );
        }

        /**
         * ============================================================================
         * STEP 2:
         * CHUNKED MULTICALL
         * ============================================================================
         */

        const multicallResults: any[] =
          [];

        const chunks = this.chunkArray(
          erc20s,
          this.MULTICALL_CHUNK_SIZE
        );

        for (const chunk of chunks) {
          /**
           * Pause during signing
           */
          if (this.transactionMode) {
            break;
          }

          try {
            const result =
              await this.withTimeout(
                client.multicall({
                  allowFailure: true,

                  contracts: chunk.map(
                    token => ({
                      address:
                        token.address as `0x${string}`,

                      abi: ERC20_ABI,

                      functionName:
                        'balanceOf',

                      args: [
                        address as `0x${string}`,
                      ],
                    })
                  ),
                }),
                this.RPC_TIMEOUT
              );

            multicallResults.push(
              ...result
            );
          } catch (chunkError) {
            console.warn(
              `[BALANCE_ENGINE] Chunk failed`,
              chunkError
            );

            for (
              let i = 0;
              i < chunk.length;
              i++
            ) {
              multicallResults.push({
                status: 'failure',
              });
            }
          }

          /**
           * ============================================================================
           * VERY IMPORTANT
           * ============================================================================
           */

          await this.yieldThread();

          await this.sleep(
            this.HOT_CHAIN_DELAY
          );
        }

        const latency =
          performance.now() - startTime;

        rpcRoutingEngine.reportSuccess(
          provider.url,
          chain.chainId,
          latency
        );

        /**
         * ============================================================================
         * BUILD SAFE ASSETS
         * ============================================================================
         */

        const rows: AssetRow[] =
          assets.map(asset => {
            try {
              let balance = '0';

              if (asset.isNative) {
                balance = formatUnits(
                  nativeBalance,
                  asset.decimals || 18
                );
              } else {
                const tokenIndex =
                  erc20s.findIndex(
                    t =>
                      t.address ===
                      asset.address
                  );

                const result =
                  multicallResults[
                  tokenIndex
                  ];

                if (
                  result &&
                  result.status ===
                  'success'
                ) {
                  balance = formatUnits(
                    result.result as bigint,
                    asset.decimals || 18
                  );
                }
              }

              return {
                ...asset,
                balance,
                updatedAt: Date.now(),
              } as AssetRow;
            } catch {
              return {
                ...asset,
                balance: '0',
                updatedAt: Date.now(),
              } as AssetRow;
            }
          });

        return rows;
      } catch (error: any) {
        const isRateLimit =
          error?.message?.includes(
            '429'
          ) || error?.status === 429;

        console.warn(
          `[BALANCE_ENGINE] Provider failed ${provider.url}`,
          error
        );

        rpcRoutingEngine.reportFailure(
          provider.url,
          chain.chainId,
          isRateLimit
        );

        attempt++;

        /**
         * ============================================================================
         * BACKOFF
         * ============================================================================
         */

        await this.sleep(
          1000 * attempt
        );
      } finally {
        this.releaseSlot();
      }
    }

    throw new Error(
      `[BALANCE_ENGINE] Exhausted RPC pool for chain ${chain.chainId}`
    );
  }

  /**
   * ============================================================================
   * CONCURRENCY
   * ============================================================================
   */

  private async acquireSlot() {
    while (
      this.activeRequests >=
      this.MAX_CONCURRENT_REQUESTS
    ) {
      await this.sleep(100);
    }

    this.activeRequests++;
  }

  private releaseSlot() {
    this.activeRequests = Math.max(
      0,
      this.activeRequests - 1
    );
  }

  /**
   * ============================================================================
   * UTILITIES
   * ============================================================================
   */

  private chunkArray<T>(
    array: T[],
    size: number
  ): T[][] {
    const chunks: T[][] = [];

    for (
      let i = 0;
      i < array.length;
      i += size
    ) {
      chunks.push(
        array.slice(i, i + size)
      );
    }

    return chunks;
  }

  private async yieldThread() {
    return new Promise(resolve =>
      setTimeout(resolve, 0)
    );
  }

  private async sleep(ms: number) {
    return new Promise(resolve =>
      setTimeout(resolve, ms)
    );
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,

      new Promise<T>(
        (_, reject) =>
          setTimeout(() => {
            reject(
              new Error(
                `RPC Timeout (${timeoutMs}ms)`
              )
            );
          }, timeoutMs)
      ),
    ]);
  }
}

export const balanceEngine =
  BalanceEngine.getInstance();