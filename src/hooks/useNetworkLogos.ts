
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ChainConfig } from '@/lib/types';
import evmNetworks from '@/lib/evmNetworks.json';

const ALL_CHAINS_LIST: Omit<ChainConfig, 'iconUrl'>[] = Object.values(evmNetworks).map(n => ({ ...n, currencySymbol: n.symbol }));

/**
 * Hook to resolve network metadata and provide a high-performance indexed registry.
 * Decoupled from direct logo URL resolution to allow TokenLogoDynamic to handle async hydration.
 */
export function useNetworkLogos() {
    const [chainsWithLogos, setChainsWithLogos] = useState<ChainConfig[]>(ALL_CHAINS_LIST.map(c => ({...c, iconUrl: null})));
    const [areLogosLoading, setAreLogosLoading] = useState(false);

    useEffect(() => {
        // Initialize chains with null iconUrls; the branding engine will resolve them via IndexedDB/CDN
        const chains = ALL_CHAINS_LIST.map((chain) => ({
            ...chain,
            iconUrl: null,
        }));
        
        setChainsWithLogos(chains);
        setAreLogosLoading(false);
    }, []);

    // Create a high-performance ID-to-Chain mapping
    const allChainsMap = useMemo(() => {
        return chainsWithLogos.reduce((acc, chain) => {
            acc[chain.chainId] = chain;
            return acc;
        }, {} as { [key: number]: ChainConfig });
    }, [chainsWithLogos]);

    return { chainsWithLogos, areLogosLoading, allChainsMap };
}
