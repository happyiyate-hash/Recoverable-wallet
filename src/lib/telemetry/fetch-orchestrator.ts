'use client';

import { systemEmitter } from '@/lib/events/systemEmitter';
import { TelemetryEventType } from './event-types';
import type { ChainConfig, WalletWithMetadata } from '@/lib/types';
import { balanceEngine } from '@/lib/services/balance-engine';
import evmNetworks from '@/lib/evmNetworks.json';

const SUPPORTED_CHAINS = new Set(Object.values(evmNetworks).map((n: any) => n.chainId));

/**
 * PRODUCTION-GRADE CENTRALIZED REFRESH ORCHESTRATOR
 * Version: 2.0.0 (Event-Driven & Cache-Invalidating Standard)
 * 
 * Rules:
 * 1. Single Source of Truth: Only this class triggers balance fetches.
 * 2. High-Priority: Visible networks schedule immediately with a short debounce.
 * 3. Low-Priority: Background networks schedule staggeredly (min 20s between checks) and yield the main thread.
 * 4. Interruption Guard: Suspends all background polling when the page is hidden, or when transaction modals/animations are active.
 * 5. Event-Driven Realtime: Listens to TRANSFER / TRANSACTION_DETECTED events, invalidates only affected cache keys, and schedules target-priority fetches.
 */
export class FetchOrchestrator {
  private static instance: FetchOrchestrator | null = null;

  // Injection Dependencies
  private wallets: WalletWithMetadata[] | null = null;
  private infuraApiKey: string | null = null;
  private alchemyApiKey: string | null = null;
  private setBalancesCallback: ((update: (prev: any) => any) => void) | null = null;
  private chains: ChainConfig[] = [];

  // Active Viewing Parameters
  private activeChainId: number | null = null;
  private isTransactionActive: boolean = false;
  private isTabVisible: boolean = true;

  // Queues & Timers
  private lastFetchTimestamps: Record<number, number> = {};
  private scheduledDebounces: Record<number, NodeJS.Timeout> = {};
  private backgroundPollingTimer: NodeJS.Timeout | null = null;
  private isExecutingFetch: boolean = false;

  // Guard Systems
  private activeJobs: Set<number> = new Set();
  private refreshTimestamps10s: number[] = [];
  private isSuspendedDueToStorm: boolean = false;

  private checkStormWarning(): boolean {
    const now = Date.now();
    this.refreshTimestamps10s = this.refreshTimestamps10s.filter(t => now - t < 10000);
    if (this.refreshTimestamps10s.length >= 5) {
      if (!this.isSuspendedDueToStorm) {
        this.isSuspendedDueToStorm = true;
        console.warn("[ORCHESTRATOR] STORM_WARNING: Refresh rate limit exceeded (>= 5 in 10s). Pausing orchestrator.");
        systemEmitter.emit('STORM_WARNING', {
          count: this.refreshTimestamps10s.length,
          timestamp: now
        });
      }
      return true;
    }
    this.isSuspendedDueToStorm = false;
    return false;
  }

  private constructor() {
    if (typeof window !== 'undefined') {
      this.isTabVisible = !document.hidden;
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      
      // Listen to transaction modal triggers
      systemEmitter.on('TRANSACTION_MODAL_OPEN', () => this.setTransactionState(true));
      systemEmitter.on('TRANSACTION_MODAL_CLOSE', () => this.setTransactionState(false));

      // Listen to real-time transaction watcher events for selective balance invalidations
      systemEmitter.on('TRANSACTION_DETECTED', (tx: any) => {
        this.handleRealtimeTransaction(tx);
      });
    }
  }

  public static getInstance(): FetchOrchestrator {
    if (!FetchOrchestrator.instance) {
      FetchOrchestrator.instance = new FetchOrchestrator();
    }
    return FetchOrchestrator.instance;
  }

  /**
   * Initializes or updates credentials and callback references required for fetching.
   */
  public updateConfig(config: {
    wallets: WalletWithMetadata[] | null;
    infuraApiKey: string | null;
    alchemyApiKey: string | null;
    setBalances: (update: (prev: any) => any) => void;
    chains?: ChainConfig[];
  }) {
    this.wallets = config.wallets;
    this.infuraApiKey = config.infuraApiKey;
    this.alchemyApiKey = config.alchemyApiKey;
    this.setBalancesCallback = config.setBalances;
    if (config.chains) {
      this.chains = config.chains;
    }
  }

  public setActiveChain(chainId: number) {
    if (this.activeChainId !== chainId) {
      const prev = this.activeChainId;
      this.activeChainId = chainId;
      console.log(`[ORCHESTRATOR] Active network changed: ${prev} -> ${chainId}`);
      
      // Immediately trigger high priority pull on network change
      const targetChain = this.chains.find(c => c.chainId === chainId);
      if (targetChain) {
        this.scheduleRefresh({
          chain: targetChain,
          priority: 'high',
          origin: 'view_switch',
          source: 'FetchOrchestrator',
          trigger: 'setActiveChain',
          parentTrigger: `network_change_to_${chainId}`,
          executionId: `exec-${Math.random().toString(36).slice(2, 9)}`
        });
      }

      systemEmitter.emit(TelemetryEventType.REFRESH_TRIGGER, {
        id: Math.random().toString(36).slice(2, 9),
        chainId,
        origin: 'view_switch',
        priority: 'high',
        tokens: [],
        timestamp: Date.now()
      });
    }
  }

  public setTransactionState(isActive: boolean) {
    this.isTransactionActive = isActive;
    console.log(`[ORCHESTRATOR] Transaction Signing Mode: ${isActive}. Throttling active.`);
    if (!isActive) {
      // Resume background processes
      this.scheduleAllBackgroundRefresh(this.chains);
    }
  }

  private handleVisibilityChange = () => {
    this.isTabVisible = !document.hidden;
    console.log(`[ORCHESTRATOR] Tab visibility changed. Visible: ${this.isTabVisible}`);
    if (this.isTabVisible) {
      this.scheduleAllBackgroundRefresh(this.chains);
    } else {
      this.clearBackgroundTimer();
    }
  };

  /**
   * Handle realtime incoming/outgoing transaction notifications.
   * Invalidate affected cache keys selectively and pull targeted balances.
   */
  private handleRealtimeTransaction(tx: any) {
    if (!tx || !tx.chainId) return;

    console.log(`[ORCHESTRATOR] Realtime transaction detected on chain ${tx.chainId} for asset ${tx.symbol}. Invalidation in progress.`);

    // Find affected chain
    const chain = this.chains.find(c => c.chainId === tx.chainId);
    if (!chain) return;

    // Invalidate memory cache in balanceEngine to guarantee subsequent fetch is fresh
    if (this.wallets && this.wallets.length > 0) {
      const address = this.wallets[0].address.toLowerCase();
      const cacheKey = `balances:${tx.chainId}:${address}`;
      balanceEngine.invalidateCache(cacheKey);
    }

    // Schedule immediate targeted refresh
    this.scheduleRefresh({
      chain,
      priority: 'high',
      origin: 'realtime_watcher',
      tokens: tx.tokenAddress ? [tx.tokenAddress] : [],
      source: 'FetchOrchestrator',
      trigger: 'handleRealtimeTransaction',
      parentTrigger: `TRANSACTION_DETECTED_${tx.hash}`,
      executionId: `exec-${Math.random().toString(36).slice(2, 9)}`
    });

    systemEmitter.emit(TelemetryEventType.REALTIME_MUTATION, {
      chainId: tx.chainId,
      symbol: tx.symbol,
      tokenAddress: tx.tokenAddress,
      hash: tx.hash,
      timestamp: Date.now()
    });
  }

  /**
   * Schedules a refresh for a specific chain.
   */
  public scheduleRefresh(config: {
    chain: ChainConfig;
    priority: 'high' | 'low';
    origin: string;
    tokens?: string[];
    source?: string;
    trigger?: string;
    parentTrigger?: string;
    executionId?: string;
  }) {
    const chainId = config.chain.chainId;
    const isHigh = config.priority === 'high' || chainId === this.activeChainId;

    // 1. Strict chain validation
    if (!SUPPORTED_CHAINS.has(chainId)) {
      console.warn(`[ORCHESTRATOR] Rejected refresh for unsupported/invalid chain ID: ${chainId}`);
      return;
    }

    // 2. Active Job Locking
    if (this.activeJobs.has(chainId)) {
      console.log(`[ORCHESTRATOR] Fetch for chain ${chainId} already in progress. Skipping schedule.`);
      return;
    }

    // 3. Storm Warning Check
    if (this.checkStormWarning()) {
      console.warn(`[ORCHESTRATOR] Schedule refresh blocked for chain ${chainId} due to STORM_WARNING.`);
      return;
    }

    // Reject low priority background pulls if disabled, tab is hidden, or signing transaction
    if (!isHigh && (!this.isTabVisible || this.isTransactionActive)) {
      return;
    }

    // Coalesce / Debounce multiple triggers within 400ms to avoid Promise storms
    if (this.scheduledDebounces[chainId]) {
      clearTimeout(this.scheduledDebounces[chainId]);
    }

    const delay = isHigh ? 100 : 800; // Fast-track visible network, delay background
    const executionId = config.executionId || `exec-${Math.random().toString(36).slice(2, 9)}`;

    this.scheduledDebounces[chainId] = setTimeout(() => {
      delete this.scheduledDebounces[chainId];
      this.executeFetch({
        chain: config.chain,
        priority: isHigh ? 'high' : 'low',
        origin: config.origin,
        tokens: config.tokens || [],
        source: config.source,
        trigger: config.trigger,
        parentTrigger: config.parentTrigger,
        executionId
      });
    }, delay);

    systemEmitter.emit(TelemetryEventType.REFRESH_QUEUED, {
      chainId,
      priority: isHigh ? 'high' : 'low',
      origin: config.origin,
      source: config.source,
      trigger: config.trigger,
      parentTrigger: config.parentTrigger,
      executionId,
      timestamp: Date.now()
    });
  }

  private async executeFetch(config: {
    chain: ChainConfig;
    priority: 'high' | 'low';
    origin: string;
    tokens: string[];
    source?: string;
    trigger?: string;
    parentTrigger?: string;
    executionId?: string;
  }) {
    if (!this.wallets || this.wallets.length === 0 || !this.setBalancesCallback) {
      console.warn(`[ORCHESTRATOR] Deferred fetch on ${config.chain.name} - Config not initialized.`);
      return;
    }

    const chainId = config.chain.chainId;

    // 1. Strict chain validation
    if (!SUPPORTED_CHAINS.has(chainId)) {
      console.warn(`[ORCHESTRATOR] Execution rejected for unsupported/invalid chain ID: ${chainId}`);
      return;
    }

    // 2. Active Job Locking
    if (this.activeJobs.has(chainId)) {
      console.log(`[ORCHESTRATOR] Execution skipped: Fetch for chain ${chainId} is already running.`);
      return;
    }

    // 3. Storm Warning Check
    if (this.checkStormWarning()) {
      console.warn(`[ORCHESTRATOR] Execution blocked for chain ${chainId} due to STORM_WARNING.`);
      return;
    }

    // Strict throttle check: Background chains must not refresh more than once every 20s
    if (config.priority === 'low') {
      const last = this.lastFetchTimestamps[chainId] || 0;
      if (Date.now() - last < 20000) {
        console.log(`[ORCHESTRATOR] Throttling background pull for ${config.chain.name} (last pull was ${Math.round((Date.now() - last) / 1000)}s ago)`);
        return;
      }
    }

    const transactionId = config.executionId || Math.random().toString(36).slice(2, 9);
    
    // Record execution timestamp for rate limiting
    this.refreshTimestamps10s.push(Date.now());
    this.lastFetchTimestamps[chainId] = Date.now();
    this.activeJobs.add(chainId);

    systemEmitter.emit(TelemetryEventType.REFRESH_BATCH_START, {
      id: transactionId,
      chainId,
      priority: config.priority,
      origin: config.origin,
      source: config.source,
      trigger: config.trigger,
      parentTrigger: config.parentTrigger,
      executionId: transactionId,
      timestamp: Date.now()
    });

    try {
      this.isExecutingFetch = true;
      // Fetch via balance engine
      const balances = await balanceEngine.fetchChainBalances(
        config.chain,
        this.wallets,
        this.infuraApiKey,
        this.alchemyApiKey
      );

      if (balances && balances.length > 0) {
        this.setBalancesCallback(prev => ({
          ...prev,
          [chainId]: balances
        }));
      }

      systemEmitter.emit(TelemetryEventType.REFRESH_BATCH_COMPLETED, {
        id: transactionId,
        chainId,
        priority: config.priority,
        origin: config.origin,
        source: config.source,
        trigger: config.trigger,
        parentTrigger: config.parentTrigger,
        executionId: transactionId,
        success: true,
        duration: Date.now() - this.lastFetchTimestamps[chainId],
        timestamp: Date.now()
      });
    } catch (e: any) {
      console.error(`[ORCHESTRATOR] Error fetching balances on ${config.chain.name}:`, e);
      systemEmitter.emit(TelemetryEventType.REFRESH_BATCH_COMPLETED, {
        id: transactionId,
        chainId,
        priority: config.priority,
        origin: config.origin,
        source: config.source,
        trigger: config.trigger,
        parentTrigger: config.parentTrigger,
        executionId: transactionId,
        success: false,
        error: e.message || 'Unknown Error',
        timestamp: Date.now()
      });
    } finally {
      this.activeJobs.delete(chainId);
      this.isExecutingFetch = false;
    }
  }

  /**
   * Periodically schedules checks for non-active chains in a staggering fashion.
   */
  public scheduleAllBackgroundRefresh(
    chains: ChainConfig[] = [],
    trace?: { source?: string; trigger?: string; parentTrigger?: string }
  ) {
    this.clearBackgroundTimer();
    
    // Save chains list locally
    if (chains.length > 0) {
      this.chains = chains;
    }

    if (!this.isTabVisible || this.isTransactionActive || this.chains.length === 0) return;

    const runBackgroundCycle = async () => {
      // Loop staggeredly through other chains
      const otherChains = this.chains.filter(c => c.chainId !== this.activeChainId);
      for (const chain of otherChains) {
        // Yield thread execution breather to avoid thread blocking
        await new Promise(r => setTimeout(r, 2000));
        
        if (!this.isTabVisible || this.isTransactionActive) break;
        
        this.scheduleRefresh({
          chain,
          priority: 'low',
          origin: 'background_cycle',
          source: trace?.source || 'FetchOrchestrator',
          trigger: trace?.trigger || 'background_cycle',
          parentTrigger: trace?.parentTrigger,
          executionId: `exec-${Math.random().toString(36).slice(2, 9)}`
        });
      }

      // Re-trigger in 30s
      this.backgroundPollingTimer = setTimeout(runBackgroundCycle, 30000);
    };

    this.backgroundPollingTimer = setTimeout(runBackgroundCycle, 5000);
  }

  private clearBackgroundTimer() {
    if (this.backgroundPollingTimer) {
      clearTimeout(this.backgroundPollingTimer);
      this.backgroundPollingTimer = null;
    }
  }

  public shutdown() {
    this.clearBackgroundTimer();
    Object.values(this.scheduledDebounces).forEach(clearTimeout);
    this.scheduledDebounces = {};
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}
export const fetchOrchestrator = FetchOrchestrator.getInstance();
