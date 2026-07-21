'use client';

import { ethers } from 'ethers';
import { notificationService } from './notification-service';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { systemEmitter } from '../events/systemEmitter';
import type { UnifiedTransaction } from '../types';

/**
 * INSTITUTIONAL GLOBAL WATCHER SERVICE
 * Version: 5.0.0 (Multi-Chain Indexed Sentinel)
 * 
 * Logic Node:
 * 1. REAL-TIME INDEXING: Watches all enabled chains for native and ERC20 events.
 * 2. UNIFIED EMISSION: Broadcasts normalized transactions to the master WalletProvider.
 * 3. ERC20 DETECTION: Dynamically detects token transfers targeting the wallet address.
 */

const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)"
];

export class GlobalWatcherService {
  private static instance: GlobalWatcherService;
  private providers: Map<number, ethers.WebSocketProvider | ethers.JsonRpcProvider> = new Map();
  private activeWatchers: Map<string, () => void> = new Map();
  private knownTokens: Map<string, { symbol: string; decimals: number }> = new Map();
  private startedAddresses: Set<string> = new Set();
  private startedChains: Set<number> = new Set();
  private listenerRegistry: Map<string, boolean> = new Map();

  private constructor() {}

  static getInstance(): GlobalWatcherService {
    if (!GlobalWatcherService.instance) {
      GlobalWatcherService.instance = new GlobalWatcherService();
    }
    return GlobalWatcherService.instance;
  }

  /**
   * Initializes or updates RPC nodes for monitoring.
   */
  updateProviders(rpcUrls: Record<number, string>) {
    Object.entries(rpcUrls).forEach(([chainId, url]) => {
      const id = Number(chainId);
      if (this.providers.has(id)) return;

      try {
        if (url.startsWith('wss://')) {
          const provider = new ethers.WebSocketProvider(url);
          this.providers.set(id, provider);
          provider.on('error', () => console.warn(`[WATCHER] WSS Error on ${id}`));
        } else {
          this.providers.set(id, new ethers.JsonRpcProvider(url));
        }
      } catch (e) {
        console.warn(`[WATCHER_INIT_FAIL] Chain ${id}:`, e);
      }
    });
  }

  /**
   * Watches a specific address across all supported chains.
   */
  async watchAddress(address: string, chainId: number, userId: string) {
    const provider = this.providers.get(chainId);
    if (!provider) return;

    const watcherKey = `${chainId}:${address.toLowerCase()}`;
    if (this.activeWatchers.has(watcherKey) || this.startedAddresses.has(watcherKey)) {
        console.log(`[WATCHER_SKIP] Node ${address.slice(0, 8)} already active on chain ${chainId}`);
        return;
    }

    this.startedAddresses.add(watcherKey);

    console.log(`[WATCHER_START] Orchestrating node ${address.slice(0, 8)} on chain ${chainId}`);

    const stopNative = await this.watchNativeTransfers(address, chainId, userId, provider);
    const stopTokens = await this.watchTokenTransfers(address, chainId, userId, provider);

    this.activeWatchers.set(watcherKey, () => {
      stopNative();
      stopTokens();
    });
  }

  private async watchNativeTransfers(address: string, chainId: number, userId: string, provider: any) {
    const onBlock = async (blockNumber: number) => {
      try {
        const block = await provider.getBlock(blockNumber, true);
        if (!block) return;

        block.prefetchedTransactions.forEach(async (tx: any) => {
          if (tx.to?.toLowerCase() === address.toLowerCase()) {
            this.handleDetectedTransaction({
              id: tx.hash,
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              amount: parseFloat(ethers.formatEther(tx.value)),
              symbol: 'ETH', // Fallback, will be refined by chain config in provider
              chainId,
              timestamp: new Date().toISOString(),
              status: 'completed',
              isOut: false,
              type: 'receive'
            }, userId);
          }
        });
      } catch (e) {}
    };

    provider.on('block', onBlock);
    return () => provider.off('block', onBlock);
  }

  private async watchTokenTransfers(address: string, chainId: number, userId: string, provider: any) {
    const filterTo = {
      address: null, // Any contract
      topics: [
        ethers.id("Transfer(address,address,uint256)"),
        null,
        ethers.zeroPadValue(address, 32)
      ]
    };

    const filterFrom = {
        address: null,
        topics: [
          ethers.id("Transfer(address,address,uint256)"),
          ethers.zeroPadValue(address, 32),
          null
        ]
    };

    const onTransfer = async (log: any) => {
      try {
        const contract = new ethers.Contract(log.address, ERC20_ABI, provider);
        const iface = new ethers.Interface(ERC20_ABI);
        const parsed = iface.parseLog(log);
        if (!parsed) return;

        const from = parsed.args[0];
        const to = parsed.args[1];
        const value = parsed.args[2];

        // Resolve token metadata
        let tokenInfo = this.knownTokens.get(log.address.toLowerCase());
        if (!tokenInfo) {
           const [symbol, decimals] = await Promise.all([
             contract.symbol(),
             contract.decimals()
           ]);
           tokenInfo = { symbol, decimals };
           this.knownTokens.set(log.address.toLowerCase(), tokenInfo);
        }

        this.handleDetectedTransaction({
          id: log.transactionHash,
          hash: log.transactionHash,
          from,
          to,
          amount: parseFloat(ethers.formatUnits(value, tokenInfo.decimals)),
          symbol: tokenInfo.symbol,
          tokenAddress: log.address,
          chainId,
          timestamp: new Date().toISOString(),
          status: 'completed',
          isOut: from.toLowerCase() === address.toLowerCase(),
          type: from.toLowerCase() === address.toLowerCase() ? 'send' : 'receive'
        }, userId);

      } catch (e) {}
    };

    provider.on(filterTo, onTransfer);
    provider.on(filterFrom, onTransfer);

    return () => {
      provider.off(filterTo, onTransfer);
      provider.off(filterFrom, onTransfer);
    };
  }

  private async handleDetectedTransaction(tx: UnifiedTransaction, userId: string) {
    // 📳 HAPTIC HANDSHAKE
    await Haptics.impact({ style: ImpactStyle.Heavy });

    // 🛰️ GLOBAL EMISSION
    systemEmitter.emit('TRANSACTION_DETECTED', tx);

    // 🔔 PERSISTENT NOTIFICATION
    await notificationService.createNotification({
      user_id: userId,
      type: tx.type,
      title: tx.isOut ? 'Transaction Dispatched' : 'Payload Received',
      body: `${tx.isOut ? 'Sent' : 'Received'} ${tx.amount} ${tx.symbol}. Node synchronization complete.`,
      metadata: { hash: tx.hash, chainId: tx.chainId, tokenAddress: tx.tokenAddress }
    });
  }

  stopAddress(address: string, chainId: number) {
    const key = `${chainId}:${address.toLowerCase()}`;
    const stop = this.activeWatchers.get(key);
    if (stop) {
      stop();
      this.activeWatchers.delete(key);
      this.startedAddresses.delete(key);
    }
  }

  stopAll() {
    this.activeWatchers.forEach(stop => stop());
    this.activeWatchers.clear();
    this.startedAddresses.clear();
    this.startedChains.clear();
    console.log("[WATCHER_STOP] All sentinel nodes decommissioned.");
  }
}

export const globalWatcher = GlobalWatcherService.getInstance();
