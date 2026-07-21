
'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/contexts/wallet-provider';

/**
 * REAL-TIME GAS PRICE HOOK
 * Synchronizes with the backend fee service to provide verified network costs.
 */
export function useGasPrice(chainId?: number) {
  const { allChainsMap, infuraApiKey } = useWallet();
  const [data, setData] = useState({
    priceGwei: '0',
    nativeFee: '0',
    estimatedTime: '...',
    status: 'idle' as 'idle' | 'loading' | 'success' | 'error'
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!chainId || !allChainsMap[chainId]) return;

    const fetchFees = async () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      setData(prev => ({ ...prev, status: 'loading' }));
      
      const chain = allChainsMap[chainId];
      const params = new URLSearchParams({
        chainType: chain.type || 'evm',
        rpcUrl: chain.rpcUrl,
        symbol: chain.symbol,
        apiKey: infuraApiKey || ''
      });

      try {
        const response = await fetch(`/api/fees?${params.toString()}`, {
          signal: abortControllerRef.current.signal
        });
        const result = await response.json();

        if (result.error) throw new Error(result.error);

        setData({
          priceGwei: result.gasPriceGwei || (result.satPerVByte ? `${result.satPerVByte} sat/vB` : '0'),
          nativeFee: result.nativeFee,
          estimatedTime: result.estimatedTime,
          status: 'success'
        });
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        setData(prev => ({ ...prev, status: 'error' }));
      }
    };

    fetchFees();
    const interval = setInterval(fetchFees, 35000); // Refresh slightly after cache TTL
    
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [chainId, allChainsMap, infuraApiKey]);

  return data;
}
