
'use client';

import { fetchChainFees } from '@/lib/wallets/services/fee-service';
import evmNetworks from '@/lib/evmNetworks.json';

/**
 * INSTITUTIONAL GAS PRICE SERVICE
 * Version: 5.0.0 (39-Chain Comprehensive SDK Integration)
 * 
 * Centralized registry for multi-chain gas discovery and caching.
 * Exposes real-time price data and estimated fees for all 39 blockchains.
 * 
 * This service acts as the high-fidelity bridge between the blockchain 
 * hardware layers and the terminal's Send/Swap pages.
 */

export interface GasData {
  priceGwei: string;
  nativeFee: string;
  usdFee: number;
}

// Global Singleton Cache for direct property access across the terminal
export const gasCache: Record<string, GasData> = {};

class GasService {
  private interval: NodeJS.Timeout | null = null;
  private listeners: Set<() => void> = new Set();
  private isUpdating = false;

  constructor() {}

  /**
   * Dispatches a network handshake to the fee gateway for a specific chain.
   */
  async fetchGas(chain: any, apiKey: string | null) {
    if (!chain || !chain.rpcUrl) return;
    try {
      // Direct Handshake with the Multi-Chain SDK Service
      const result = await fetchChainFees(
        chain.type || 'evm',
        chain.rpcUrl,
        chain.symbol,
        apiKey
      );
      
      const data: GasData = {
        priceGwei: result.gasPriceGwei || (result.satPerVByte ? `${result.satPerVByte} sat/vB` : '0'),
        nativeFee: result.nativeFee || '0',
        usdFee: result.usdFee || 0.05
      };

      // Atomic Cache Update
      gasCache[chain.name] = data;
      this.notify();
    } catch (e) {
      // Node advisory: Registry handshake deferred for this cycle
    }
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  /**
   * Subscribe to registry updates for reactive UI synchronization.
   */
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Returns the latest gas price object for the specified blockchain.
   * UI components use this to display nativeFee and symbol.
   */
  getGasPrice(chainName: string): GasData | null {
    if (!chainName) return null;
    return gasCache[chainName] || null;
  }

  /**
   * Returns an estimated transaction fee for sending or swapping.
   * Internal logic applies a 2x multiplier for complex multi-hop swaps.
   */
  getEstimatedTransactionFee(chainName: string, txType: 'send' | 'swap'): number {
    const data = this.getGasPrice(chainName);
    if (!data) return 0.05;
    return txType === 'send' ? data.usdFee : data.usdFee * 2;
  }

  /**
   * Starts the background synchronization worker.
   * Sequentially polls all 39 supported blockchains every 10 seconds.
   */
  startGasUpdater(chains: any[], apiKey: string | null) {
    if (this.interval) return;
    
    const run = async () => {
      if (this.isUpdating) return;
      this.isUpdating = true;

      // SEQUENTIAL REGISTRY SCAN
      // We process in small batches to prevent client-side network congestion
      const batchSize = 5;
      for (let i = 0; i < chains.length; i += batchSize) {
        const batch = chains.slice(i, i + batchSize);
        await Promise.all(batch.map(c => this.fetchGas(c, apiKey)));
        // Dwell time between batches to manage RPC quotas
        await new Promise(r => setTimeout(r, 200));
      }

      this.isUpdating = false;
    };
    
    run();
    this.interval = setInterval(run, 10000);
  }

  /**
   * Hard stop for the updater (session termination).
   */
  stopGasUpdater() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

export const gasService = new GasService();
