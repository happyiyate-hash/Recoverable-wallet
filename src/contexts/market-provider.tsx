'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from 'react';

import { fetchGlobalMarketData, type PriceResult } from '@/lib/market/price-service';
import { useCurrency } from './currency-provider';
import type { AssetRow, ChainConfig } from '@/lib/types';
import evmNetworks from '@/lib/evmNetworks.json';
import { registryDb } from '@/lib/storage/registry-db';
import {
  getDirectLogoUrl,
  getCDNFullChainName,
  fetchNetworkTokens,
} from '@/lib/getTokenLogo';
import { getInitialAssets } from '@/lib/wallets/balances';
import {
  fetchSingleTokenDetails,
  fetchChartData,
} from '@/lib/coingecko';

interface MarketContextType {
  prices: PriceResult;
  statsCache: Record<string, any>;
  chartCache: Record<string, any[]>;
  discoveredTokens: AssetRow[];
  isMarketLoading: boolean;
  refreshPrices: () => Promise<void>;
  registerCustomTokens: (tokens: AssetRow[]) => void;
  prefetchToken: (id: string, chainId: number, address: string) => void;
  saveChartToCache: (key: string, data: any[]) => void;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

const PRICE_UPDATE_INTERVAL = 30000;
const PRICE_CACHE_KEY = 'ss-price-cache-global';
const CHART_CACHE_KEY = 'ss-chart-registry-persistent';
const STATS_CACHE_KEY = 'ss-stats-registry-persistent';
const MAX_CACHE_ENTRIES = 50;
const QUEUE_DELAY = 1200;
const DISCOVERY_DELAY = 200;

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function trimCacheObject<T extends Record<string, any>>(obj: T, max: number): T {
  const keys = Object.keys(obj);

  if (keys.length <= max) return obj;

  const next = { ...obj };

  while (Object.keys(next).length > max) {
    delete next[Object.keys(next)[0]];
  }

  return next;
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const { rates } = useCurrency();

  const [prices, setPrices] = useState<PriceResult>({});
  const [statsCache, setStatsCache] = useState<Record<string, any>>({});
  const [chartCache, setChartCache] = useState<Record<string, any[]>>({});
  const [discoveredTokens, setDiscoveredTokens] = useState<AssetRow[]>([]);
  const [isMarketLoading, setIsMarketLoading] = useState(true);

  const mountedRef = useRef(true);

  const customTokensRef = useRef<AssetRow[]>([]);
  const hasInitializedAssetsRef = useRef(false);

  const statsCacheRef = useRef<Record<string, any>>({});
  const chartCacheRef = useRef<Record<string, any[]>>({});
  const pricesRef = useRef<PriceResult>({});

  const refreshLockRef = useRef(false);

  const prefetchQueueRef = useRef<Set<string>>(new Set());
  const logoQueueRef = useRef<Set<string>>(new Set());

  const taskQueueRef = useRef<
    Array<{ id: string; chainId: number; address: string }>
  >([]);

  const processingQueueRef = useRef(false);

  const chartWriteTimerRef = useRef<any>(null);
  const statsWriteTimerRef = useRef<any>(null);
  const priceWriteTimerRef = useRef<any>(null);

  /**
   * Keep refs synced
   */
  useEffect(() => {
    statsCacheRef.current = statsCache;
  }, [statsCache]);

  useEffect(() => {
    chartCacheRef.current = chartCache;
  }, [chartCache]);

  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  /**
   * Mount / unmount guard
   */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      clearTimeout(chartWriteTimerRef.current);
      clearTimeout(statsWriteTimerRef.current);
      clearTimeout(priceWriteTimerRef.current);
    };
  }, []);

  /**
   * Hydrate persistent cache
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedCharts = safeJsonParse<Record<string, any[]>>(
      localStorage.getItem(CHART_CACHE_KEY),
      {}
    );

    const savedStats = safeJsonParse<Record<string, any>>(
      localStorage.getItem(STATS_CACHE_KEY),
      {}
    );

    const savedPrices = safeJsonParse<{
      data?: PriceResult;
      timestamp?: number;
    }>(localStorage.getItem(PRICE_CACHE_KEY), {});

    setChartCache(savedCharts);
    setStatsCache(savedStats);

    if (savedPrices?.data) {
      setPrices(savedPrices.data);
      setIsMarketLoading(false);
    }
  }, []);

  /**
   * Debounced storage write helpers
   */
  const persistCharts = useCallback((data: Record<string, any[]>) => {
    if (typeof window === 'undefined') return;

    clearTimeout(chartWriteTimerRef.current);

    chartWriteTimerRef.current = setTimeout(() => {
      localStorage.setItem(CHART_CACHE_KEY, JSON.stringify(data));
    }, 250);
  }, []);

  const persistStats = useCallback((data: Record<string, any>) => {
    if (typeof window === 'undefined') return;

    clearTimeout(statsWriteTimerRef.current);

    statsWriteTimerRef.current = setTimeout(() => {
      localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(data));
    }, 250);
  }, []);

  const persistPrices = useCallback((data: PriceResult) => {
    if (typeof window === 'undefined') return;

    clearTimeout(priceWriteTimerRef.current);

    priceWriteTimerRef.current = setTimeout(() => {
      localStorage.setItem(
        PRICE_CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    }, 250);
  }, []);

  /**
   * Save chart cache
   */
  const saveChartToCache = useCallback(
    (key: string, data: any[]) => {
      setChartCache((prev) => {
        const next = trimCacheObject(
          {
            ...prev,
            [key]: data,
          },
          MAX_CACHE_ENTRIES
        );

        chartCacheRef.current = next;
        persistCharts(next);

        return next;
      });
    },
    [persistCharts]
  );

  /**
   * Save stats cache
   */
  const saveStatsToCache = useCallback(
    (id: string, data: any) => {
      setStatsCache((prev) => {
        const next = trimCacheObject(
          {
            ...prev,
            [id]: data,
          },
          MAX_CACHE_ENTRIES
        );

        statsCacheRef.current = next;
        persistStats(next);

        return next;
      });
    },
    [persistStats]
  );

  /**
   * Price merge update
   */
  const updatePrices = useCallback(
    (incoming: PriceResult) => {
      setPrices((prev) => {
        const next = {
          ...prev,
          ...incoming,
        };

        pricesRef.current = next;
        persistPrices(next);

        return next;
      });
    },
    [persistPrices]
  );

  /**
   * Background queue processor
   */
  const processQueue = useCallback(async () => {
    if (processingQueueRef.current) return;
    if (taskQueueRef.current.length === 0) return;

    processingQueueRef.current = true;

    while (
      mountedRef.current &&
      taskQueueRef.current.length > 0
    ) {
      const task = taskQueueRef.current.shift();

      if (!task) continue;

      const { id, chainId, address } = task;

      try {
        /**
         * Stats prefetch
         */
        if (!statsCacheRef.current[id]) {
          const stats = await fetchSingleTokenDetails(
            id,
            undefined,
            chainId,
            address
          );

          if (stats && mountedRef.current) {
            saveStatsToCache(id, stats);
          }
        }

        /**
         * Chart prefetch
         */
        const chartKey = `${id}:24H`;

        if (!chartCacheRef.current[chartKey]) {
          const chart = await fetchChartData(
            id,
            '24H',
            undefined,
            chainId,
            address
          );

          if (
            chart &&
            Array.isArray(chart) &&
            chart.length > 0 &&
            mountedRef.current
          ) {
            saveChartToCache(chartKey, chart);
          }
        }

        /**
         * Logo prefetch
         */
        const logoKey = `logo_v20_${String(id)
          .replace(/\s+/g, '_')
          .toLowerCase()}`;

        if (
          !logoQueueRef.current.has(logoKey) &&
          !registryDb.getLogoSync(logoKey)
        ) {
          logoQueueRef.current.add(logoKey);

          const logoUrl = await getDirectLogoUrl(id, id);

          if (logoUrl) {
            await registryDb.saveLogo(logoKey, logoUrl);
          }
        }
      } catch (error) {
        console.warn('[MARKET_QUEUE]', error);
      }

      await new Promise((resolve) =>
        setTimeout(resolve, QUEUE_DELAY)
      );
    }

    processingQueueRef.current = false;
  }, [saveChartToCache, saveStatsToCache]);

  /**
   * Queue token prefetch
   */
  const prefetchToken = useCallback(
    (id: string, chainId: number, address: string) => {
      if (!id) return;

      const uniqueKey = `${chainId}:${address || id}`;

      if (prefetchQueueRef.current.has(uniqueKey)) return;

      prefetchQueueRef.current.add(uniqueKey);

      taskQueueRef.current.push({
        id,
        chainId,
        address,
      });

      processQueue();
    },
    [processQueue]
  );

  /**
   * Register custom tokens
   */
  const registerCustomTokens = useCallback(
    (tokens: AssetRow[]) => {
      customTokensRef.current = tokens;

      tokens.forEach((token) => {
        const id = token.coingeckoId || token.address;

        if (id) {
          prefetchToken(
            id,
            token.chainId,
            token.address
          );
        }
      });
    },
    [prefetchToken]
  );

  /**
   * Discover all chain tokens from CDN
   */
  const discoverAllNetworkTokens = useCallback(
    async (chains: ChainConfig[]) => {
      const output: AssetRow[] = [];
      const seen = new Set<string>();

      for (const chain of chains) {
        try {
          const fullName = await getCDNFullChainName(
            chain.chainId,
            chain.name
          );

          const tokens = await fetchNetworkTokens(fullName);

          if (tokens?.length) {
            for (const token of tokens) {
              const address = token.contract
                ?.toLowerCase()
                .trim();

              if (!address) continue;

              const dedupeKey = `${chain.chainId}:${address}`;

              if (seen.has(dedupeKey)) continue;

              seen.add(dedupeKey);

              output.push({
                chainId: chain.chainId,
                address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals || 18,
                iconUrl: token.logo_url,
                balance: '0',
                isNative: false,
                priceSource:
                  token.priceSource || 'coingecko',
                priceId: token.priceId,
              } as AssetRow);
            }
          }
        } catch {}

        await new Promise((resolve) =>
          setTimeout(resolve, DISCOVERY_DELAY)
        );
      }

      if (mountedRef.current) {
        setDiscoveredTokens(output);
      }
    },
    []
  );

  /**
   * Prefetch built-in assets once
   */
  const prefetchAssets = useCallback(
    async (chains: ChainConfig[]) => {
      if (hasInitializedAssetsRef.current) return;

      hasInitializedAssetsRef.current = true;

      for (const chain of chains) {
        try {
          const assets = getInitialAssets(chain.chainId);

          for (const asset of assets) {
            prefetchToken(
              asset.coingeckoId || asset.address,
              chain.chainId,
              asset.address
            );
          }
        } catch {}

        await new Promise((resolve) =>
          setTimeout(resolve, 100)
        );
      }

      discoverAllNetworkTokens(chains);
    },
    [prefetchToken, discoverAllNetworkTokens]
  );

  /**
   * Refresh market prices
   */
  const refreshPrices = useCallback(async () => {
    if (refreshLockRef.current) return;

    refreshLockRef.current = true;

    try {
      const allChains =
        Object.values(evmNetworks) as ChainConfig[];

      const result = await fetchGlobalMarketData(
        allChains,
        customTokensRef.current,
        rates
      );

      if (mountedRef.current) {
        updatePrices(result);
        prefetchAssets(allChains);
      }
    } catch (error) {
      console.warn('[MARKET_REFRESH]', error);
    } finally {
      if (mountedRef.current) {
        setIsMarketLoading(false);
      }

      refreshLockRef.current = false;
    }
  }, [rates, updatePrices, prefetchAssets]);

  /**
   * Start engine
   */
  useEffect(() => {
    refreshPrices();

    const interval = setInterval(
      refreshPrices,
      PRICE_UPDATE_INTERVAL
    );

    return () => clearInterval(interval);
  }, [refreshPrices]);

  return (
    <MarketContext.Provider
      value={{
        prices,
        statsCache,
        chartCache,
        discoveredTokens,
        isMarketLoading,
        refreshPrices,
        registerCustomTokens,
        prefetchToken,
        saveChartToCache,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}

export const useMarket = () => {
  const context = useContext(MarketContext);

  if (!context) {
    throw new Error(
      'useMarket must be used within MarketProvider'
    );
  }

  return context;
};