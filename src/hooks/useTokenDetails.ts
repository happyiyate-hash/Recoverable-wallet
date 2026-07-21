'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchSingleTokenDetails } from '@/lib/coingecko';
import { useWallet } from '@/contexts/wallet-provider';
import { useMarket } from '@/contexts/market-provider';

/**
 * Hook to fetch market metadata for a specific token.
 * Version: 6.0.0 (Stability + Identity Enforcement)
 */
export function useSingleTokenDetails(
    coingeckoId: string | null | undefined, 
    chainId?: number, 
    address?: string
) {
    const { allAssets } = useWallet();
    const { statsCache, saveStatsToCache } = useMarket();

    /**
     * ✅ FIX 1: Strict identity resolution
     */
    const resolvedId = coingeckoId || null;

    /**
     * ✅ FIX 2: Safe hydration (no crash)
     */
    const [data, setData] = useState<any>(() => {
        if (!resolvedId) return null;
        return statsCache?.[resolvedId] || null;
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const isFetchingRef = useRef(false);

    useEffect(() => {
        /**
         * ✅ FIX 3: NEVER fetch without valid ID
         */
        if (!resolvedId) {
            console.warn('[STATS] Missing coingeckoId — skipping fetch');
            return;
        }

        const fetchDetails = async () => {
            if (isFetchingRef.current) return;

            const cacheHit = statsCache?.[resolvedId];

            /**
             * ✅ Only show loader if nothing exists
             */
            if (!data && !cacheHit) {
                setIsLoading(true);
            }

            isFetchingRef.current = true;
            setError(null);

            try {
                let currentPrice = 0;

                /**
                 * Keep your special token logic
                 */
                if (resolvedId === 'internal:wnc') {
                    const wnc = allAssets.find(a => a.symbol === 'WNC');
                    currentPrice = wnc?.priceUsd || 0.000606;
                }

                const result = await fetchSingleTokenDetails(
                    resolvedId,
                    currentPrice,
                    chainId,
                    address
                );

                /**
                 * ✅ FIX 4: Only update if valid
                 */
                if (result && typeof result === 'object' && Object.keys(result).length > 0) {
                    setData(result);

                    /**
                     * ✅ FIX 5: Sync to global cache
                     */
                    if (saveStatsToCache) {
                        saveStatsToCache(resolvedId, result);
                    }
                } else {
                    console.warn('[STATS] Empty response — preserving previous data');
                }

            } catch (e: any) {
                console.warn("[STATS_SYNC_ADVISORY] Market data node deferred.");
                setError(e);
            } finally {
                setIsLoading(false);
                isFetchingRef.current = false;
            }
        };

        fetchDetails();

        const interval = setInterval(fetchDetails, 60000);

        return () => clearInterval(interval);

        /**
         * ✅ FIX 6: Removed unstable dependency (allAssets)
         */
    }, [resolvedId, chainId, address]);

    return { data, isLoading, error };
}