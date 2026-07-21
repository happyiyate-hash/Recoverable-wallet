
'use client';

import { useRef, useCallback, useEffect } from 'react';
import type { ChainConfig, WalletWithMetadata, AssetRow } from '@/lib/types';
import { fetchOrchestrator } from '@/lib/telemetry/fetch-orchestrator';
import { useRenderTracker } from '@/lib/telemetry/render-tracker';

/**
 * INSTITUTIONAL STALE-WHILE-REVALIDATE (SWR) ENGINE
 * Version: 8.0.0 (Orchestrated Refresh Standard)
 */
export function useWalletEngine({
  wallets,
  viewingNetwork,
  user,
  chainsWithLogos,
  userAddedTokens,
  infuraApiKey,
  alchemyApiKey,
  setBalances,
  setIsRefreshing,
  setHasFetchedInitialData
}: {
  wallets: WalletWithMetadata[] | null;
  viewingNetwork: ChainConfig | null;
  user: any;
  chainsWithLogos: ChainConfig[];
  userAddedTokens: AssetRow[];
  infuraApiKey: string | null;
  alchemyApiKey: string | null;
  setBalances: (update: (prev: any) => any) => void;
  setIsRefreshing: (val: boolean) => void;
  setHasFetchedInitialData: (val: boolean) => void;
}) {
  // Tracing renders forensically
  useRenderTracker('useWalletEngine', {
    hasWallets: !!wallets,
    viewingNetworkId: viewingNetwork?.chainId,
    chainsWithLogosLength: chainsWithLogos?.length,
    userAddedTokensLength: userAddedTokens?.length
  });

  // Sync the orchestrator config dynamically
  useEffect(() => {
    fetchOrchestrator.updateConfig({
      wallets,
      infuraApiKey,
      alchemyApiKey,
      setBalances,
      chains: chainsWithLogos
    });
  }, [wallets, infuraApiKey, alchemyApiKey, setBalances, chainsWithLogos]);


  const executeRevalidation = useCallback(async () => {
    if (!wallets || wallets.length === 0 || !viewingNetwork || !user) return;
    
    setIsRefreshing(true);
    setHasFetchedInitialData(true);

    // Delegate revalidation fully to the centralized single-source orchestrator
    fetchOrchestrator.scheduleRefresh({
      chain: viewingNetwork,
      priority: 'high',
      origin: 'swr_engine',
      source: 'useWalletEngine',
      trigger: 'executeRevalidation',
      parentTrigger: 'network_switch_or_initial_load',
      executionId: `exec-${Math.random().toString(36).slice(2, 9)}`
    });

    // Schedule staggeredly staggered refreshes for all background chains
    if (chainsWithLogos.length > 0) {
      fetchOrchestrator.scheduleAllBackgroundRefresh(chainsWithLogos, {
        source: 'useWalletEngine',
        trigger: 'background_refresh',
        parentTrigger: 'executeRevalidation'
      });
    }
    
    setIsRefreshing(false);
  }, [wallets, viewingNetwork, chainsWithLogos, user, setIsRefreshing, setHasFetchedInitialData]);

  const executeRevalidationRef = useRef(executeRevalidation);
  useEffect(() => {
    executeRevalidationRef.current = executeRevalidation;
  }, [executeRevalidation]);

  useEffect(() => {
    if (wallets && wallets.length > 0 && viewingNetwork && user) {
      const timer = setTimeout(() => {
        executeRevalidationRef.current();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [wallets ? wallets.length : 0, viewingNetwork?.chainId, user?.id]);

  return { refresh: executeRevalidation };
}

