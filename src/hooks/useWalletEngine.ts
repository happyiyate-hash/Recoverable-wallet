'use client';

import {
  useRef,
  useCallback,
} from 'react';

import type {
  ChainConfig,
  WalletWithMetadata,
  AssetRow,
} from '@/lib/types';

import { fetchBalancesForChain } from '@/lib/wallets/services/balance-service';

/**
 * INSTITUTIONAL WALLET ENGINE
 * Version: 5.0.0
 *
 * FIXES:
 * - Prevent duplicate refresh storms
 * - Prevent navigation-triggered spam
 * - Active-chain-first architecture
 * - Background chain sleeping
 * - Visibility-safe execution
 * - Transaction freeze protection
 * - Smarter refresh scheduling
 * - Reduced rerenders
 * - Idle-safe background loading
 * - Mobile-safe execution
 * - Cached-chain freshness protection
 */

const ACTIVE_TIMEOUT = 12000;
const BACKGROUND_TIMEOUT = 15000;

const REFRESH_COOLDOWN = 5000;

/**
 * Chains remain fresh for this duration.
 * Prevents navigation spam.
 */
const CHAIN_STALE_TIME = 30000;

/**
 * Background chain delay.
 * Prevents RPC bursts.
 */
const BACKGROUND_CHAIN_DELAY = 1200;

/**
 * Only hydrate this many background chains.
 * Remaining chains sleep until needed.
 */
const MAX_BACKGROUND_CHAINS = 4;

export function useWalletEngine({
  wallets,
  viewingNetwork,
  user,
  chainsWithLogos,
  userAddedTokens,
  infuraApiKey,
  setBalances,
  setIsRefreshing,
  setHasFetchedInitialData,

  /**
   * NEW:
   * Pause refreshes during:
   * - signing
   * - swaps
   * - gas estimation
   */
  isTransactionActive = false,
}: {
  wallets: WalletWithMetadata[] | null;
  viewingNetwork: ChainConfig | null;
  user: any;
  chainsWithLogos: ChainConfig[];
  userAddedTokens: AssetRow[];
  infuraApiKey: string | null;

  setBalances: (update: (prev: any) => any) => void;

  setIsRefreshing: (val: boolean) => void;

  setHasFetchedInitialData: (
    val: boolean
  ) => void;

  isTransactionActive?: boolean;
}) {
  /**
   * Prevent concurrent refreshes
   */
  const isRefreshingRef = useRef(false);

  /**
   * Abort stale requests
   */
  const abortControllerRef =
    useRef<AbortController | null>(null);

  /**
   * Prevent refresh spam
   */
  const lastRefreshRef = useRef(0);

  /**
   * Stale request protection
   */
  const requestIdRef = useRef(0);

  /**
   * Per-chain freshness cache
   */
  const chainFreshnessRef = useRef<
    Record<number, number>
  >({});

  /**
   * ============================================================================
   * UTILITIES
   * ============================================================================
   */

  const sleep = (ms: number) =>
    new Promise(resolve =>
      setTimeout(resolve, ms)
    );

  const yieldThread = () =>
    new Promise(resolve =>
      setTimeout(resolve, 0)
    );

  const waitForIdle = async () => {
    if (
      typeof window !== 'undefined' &&
      'requestIdleCallback' in window
    ) {
      await new Promise(resolve =>
        (
          window as any
        ).requestIdleCallback(resolve, {
          timeout: 2000,
        })
      );

      return;
    }

    await sleep(120);
  };

  const withTimeout = async <T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> => {
    return Promise.race([
      promise,

      new Promise<T>((_, reject) =>
        setTimeout(() => {
          reject(
            new Error(
              `Timeout (${timeoutMs}ms)`
            )
          );
        }, timeoutMs)
      ),
    ]);
  };

  /**
   * ============================================================================
   * CHAIN FRESHNESS
   * ============================================================================
   */

  const isChainFresh = (
    chainId: number
  ) => {
    const last =
      chainFreshnessRef.current[
        chainId
      ];

    if (!last) {
      return false;
    }

    return (
      Date.now() - last <
      CHAIN_STALE_TIME
    );
  };

  const markChainFresh = (
    chainId: number
  ) => {
    chainFreshnessRef.current[
      chainId
    ] = Date.now();
  };

  /**
   * ============================================================================
   * MAIN REFRESH
   * ============================================================================
   */

  const executeRevalidation =
    useCallback(async () => {
      /**
       * HARD GUARDS
       */
      if (
        !wallets ||
        wallets.length === 0 ||
        !viewingNetwork ||
        !user
      ) {
        return;
      }

      /**
       * IMPORTANT:
       * Never refresh during signing.
       */
      if (isTransactionActive) {
        return;
      }

      /**
       * Skip hidden tabs
       */
      if (
        typeof document !==
          'undefined' &&
        document.hidden
      ) {
        return;
      }

      /**
       * Prevent duplicate refreshes
       */
      if (
        isRefreshingRef.current
      ) {
        return;
      }

      /**
       * Refresh cooldown
       */
      const now = Date.now();

      if (
        now -
          lastRefreshRef.current <
        REFRESH_COOLDOWN
      ) {
        return;
      }

      /**
       * Active chain still fresh.
       * Prevents navigation spam.
       */
      if (
        isChainFresh(
          viewingNetwork.chainId
        )
      ) {
        return;
      }

      lastRefreshRef.current =
        now;

      /**
       * Abort previous execution
       */
      if (
        abortControllerRef.current
      ) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current =
        new AbortController();

      const signal =
        abortControllerRef.current
          .signal;

      /**
       * Request identity
       */
      const requestId =
        ++requestIdRef.current;

      isRefreshingRef.current =
        true;

      setIsRefreshing(true);

      try {
        /**
         * =========================================================================
         * PHASE 1
         * ACTIVE NETWORK ONLY
         * =========================================================================
         */

        const activeBalances =
          await withTimeout(
            fetchBalancesForChain(
              viewingNetwork,
              wallets,
              infuraApiKey,
              userAddedTokens
            ),
            ACTIVE_TIMEOUT
          );

        /**
         * Stale request protection
         */
        if (
          signal.aborted ||
          requestId !==
            requestIdRef.current
        ) {
          return;
        }

        /**
         * Single targeted update
         */
        setBalances(prev => {
          /**
           * Prevent unnecessary rerender
           */
          if (
            prev[
              viewingNetwork.chainId
            ] === activeBalances
          ) {
            return prev;
          }

          return {
            ...prev,
            [
              viewingNetwork.chainId
            ]: activeBalances,
          };
        });

        markChainFresh(
          viewingNetwork.chainId
        );

        setHasFetchedInitialData(
          true
        );

        /**
         * Yield UI
         */
        await yieldThread();

        /**
         * =========================================================================
         * PHASE 2
         * LIMITED BACKGROUND HYDRATION
         * =========================================================================
         */

        const backgroundChains =
          chainsWithLogos
            .filter(
              chain =>
                chain.chainId !==
                viewingNetwork.chainId
            )

            /**
             * Skip already fresh chains
             */
            .filter(
              chain =>
                !isChainFresh(
                  chain.chainId
                )
            )

            /**
             * IMPORTANT:
             * Only hydrate a few chains.
             * Remaining chains sleep.
             */
            .slice(
              0,
              MAX_BACKGROUND_CHAINS
            );

        for (const chain of backgroundChains) {
          /**
           * Abort protection
           */
          if (
            signal.aborted ||
            requestId !==
              requestIdRef.current
          ) {
            break;
          }

          /**
           * Pause background work
           * during transaction signing.
           */
          if (
            isTransactionActive
          ) {
            break;
          }

          /**
           * Wait for idle frame
           */
          await waitForIdle();

          try {
            const balances =
              await withTimeout(
                fetchBalancesForChain(
                  chain,
                  wallets,
                  infuraApiKey,
                  userAddedTokens
                ),
                BACKGROUND_TIMEOUT
              );

            /**
             * Stale request protection
             */
            if (
              signal.aborted ||
              requestId !==
                requestIdRef.current
            ) {
              break;
            }

            setBalances(prev => ({
              ...prev,
              [chain.chainId]:
                balances,
            }));

            markChainFresh(
              chain.chainId
            );
          } catch (error) {
            console.warn(
              `[WALLET_ENGINE] Background chain failed`,
              chain.chainId,
              error
            );
          }

          /**
           * IMPORTANT:
           * Prevent RPC storms.
           */
          await sleep(
            BACKGROUND_CHAIN_DELAY
          );

          /**
           * Yield UI thread
           */
          await yieldThread();
        }
      } catch (error) {
        console.warn(
          `[WALLET_ENGINE] Refresh failed`,
          error
        );

        setHasFetchedInitialData(
          true
        );
      } finally {
        /**
         * Only clear if current request
         */
        if (
          requestId ===
          requestIdRef.current
        ) {
          isRefreshingRef.current =
            false;

          setIsRefreshing(false);
        }
      }
    }, [
      wallets,
      viewingNetwork,
      user,
      chainsWithLogos,
      userAddedTokens,
      infuraApiKey,
      setBalances,
      setIsRefreshing,
      setHasFetchedInitialData,
      isTransactionActive,
    ]);

  return {
    refresh: executeRevalidation,
  };
}