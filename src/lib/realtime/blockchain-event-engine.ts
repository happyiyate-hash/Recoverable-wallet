'use client';

import { ethers } from 'ethers';
import { systemEmitter } from '../events/systemEmitter';

interface ConnectionMetadata {
  provider: ethers.WebSocketProvider | ethers.JsonRpcProvider;
  url: string;
  isWs: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';
  latency: number;
  reconnectAttempts: number;
}

/**
 * CENTRALIZED BLOCKCHAIN EVENT ENGINE
 * 
 * Manages WebSocket RPC connections, handles auto-reconnections, pauses during hidden state,
 * triggers targeted balance syncs upon app visibility resume, and tracks connection telemetry/latency.
 */
export class BlockchainEventEngine {
  private static instance: BlockchainEventEngine | null = null;

  // Active multi-chain connections
  private connections: Map<number, ConnectionMetadata> = new Map();

  // Subscriptions track list to restore after reconnects: chainId -> Set of listener keys
  private registeredListeners: Map<number, Map<string, { filter: any; callback: (data: any) => void }>> = new Map();

  private isTabVisible: boolean = true;
  private isSigningTransaction: boolean = false;
  private latencyInterval: NodeJS.Timeout | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.isTabVisible = !document.hidden;
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      // Listen to transaction signing alerts to throttle telemetry
      systemEmitter.on('TRANSACTION_MODAL_OPEN', () => this.setSigningState(true));
      systemEmitter.on('TRANSACTION_MODAL_CLOSE', () => this.setSigningState(false));
    }

    // Periodically monitor latency of all active providers
    this.startLatencyMonitoring();
  }

  public static getInstance(): BlockchainEventEngine {
    if (!BlockchainEventEngine.instance) {
      BlockchainEventEngine.instance = new BlockchainEventEngine();
    }
    return BlockchainEventEngine.instance;
  }

  /**
   * Initializes or updates the RPC socket connection for a specific chain.
   */
  public connect(chainId: number, url: string) {
    if (!url) return;
    const current = this.connections.get(chainId);

    // If already connected to this identical URL, skip
    if (current && current.url === url && current.status === 'CONNECTED') {
      return;
    }

    this.disconnect(chainId);

    const isWs = url.startsWith('wss://');
    console.log(`[EVENT_ENGINE] Initializing connection to chain ${chainId} via ${isWs ? 'WSS' : 'HTTPS'}`);

    this.establishConnection(chainId, url, isWs);
  }

  /**
   * Disconnects and purges a chain connection.
   */
  public disconnect(chainId: number) {
    const conn = this.connections.get(chainId);
    if (!conn) return;

    // Remove active filters/listeners from the provider
    try {
      const listeners = this.registeredListeners.get(chainId);
      if (listeners && conn.provider) {
        listeners.forEach((val) => {
          conn.provider.off(val.filter);
        });
      }
    } catch (e) {
      // Suppress cleanup issues
    }

    // Force close WebSocket if possible
    try {
      if (conn.isWs && conn.provider) {
        const socket = (conn.provider as any).websocket || (conn.provider as any)._websocket;
        if (socket) {
          socket.close();
        }
      }
    } catch (e) {}

    this.connections.delete(chainId);
    console.log(`[EVENT_ENGINE] Closed connection to chain ${chainId}`);

    systemEmitter.emit('RPC_ERROR', {
      type: 'DISCONNECT',
      message: `WebSocket disconnected from chain ${chainId}`,
      chainId
    });
  }

  private establishConnection(chainId: number, url: string, isWs: boolean, attempt: number = 0) {
    if (!this.isTabVisible && isWs) {
      console.log(`[EVENT_ENGINE] Deferred WSS connect on chain ${chainId} - App is backgrounded.`);
      this.connections.set(chainId, {
        provider: new ethers.JsonRpcProvider(url.replace('wss://', 'https://')), // Fallback HTTP while backgrounded
        url,
        isWs: false,
        status: 'DISCONNECTED',
        latency: 0,
        reconnectAttempts: attempt
      });
      return;
    }

    try {
      let provider: ethers.WebSocketProvider | ethers.JsonRpcProvider;

      if (isWs) {
        provider = new ethers.WebSocketProvider(url);

        // Bind raw WebSocket open / close listeners for instant telemetry
        const socket = (provider as any).websocket || (provider as any)._websocket;
        if (socket) {
          socket.addEventListener('open', () => {
            console.log(`[EVENT_ENGINE] WebSocket opened successfully on chain ${chainId}`);
            const conn = this.connections.get(chainId);
            if (conn) {
              conn.status = 'CONNECTED';
              conn.reconnectAttempts = 0;
              this.restoreSubscriptions(chainId);
            }
          });

          socket.addEventListener('close', () => {
            console.warn(`[EVENT_ENGINE] WebSocket socket closed on chain ${chainId}`);
            this.handleDisconnect(chainId);
          });

          socket.addEventListener('error', (err: any) => {
            console.error(`[EVENT_ENGINE] WebSocket socket error on chain ${chainId}:`, err);
            this.handleDisconnect(chainId);
          });
        }
      } else {
        provider = new ethers.JsonRpcProvider(url);
      }

      this.connections.set(chainId, {
        provider,
        url,
        isWs,
        status: isWs ? 'RECONNECTING' : 'CONNECTED', // WSS waits for 'open' event
        latency: 0,
        reconnectAttempts: attempt
      });

      // If HTTP, restore immediately since there's no open handshake
      if (!isWs) {
        this.restoreSubscriptions(chainId);
      }

    } catch (e: any) {
      console.error(`[EVENT_ENGINE] Connection setup failed on chain ${chainId}:`, e);
      this.handleDisconnect(chainId);
    }
  }

  private handleDisconnect(chainId: number) {
    const conn = this.connections.get(chainId);
    if (!conn) return;

    conn.status = 'DISCONNECTED';

    if (conn.isWs) {
      const nextAttempt = conn.reconnectAttempts + 1;
      conn.reconnectAttempts = nextAttempt;

      // Exponential backoff reconnect: 1s, 2s, 4s, 8s, up to 30s max
      const delay = Math.min(30000, Math.pow(2, nextAttempt) * 1000);
      console.log(`[EVENT_ENGINE] Scheduling WSS reconnect for chain ${chainId} in ${delay}ms (Attempt ${nextAttempt})`);

      setTimeout(() => {
        const current = this.connections.get(chainId);
        if (current && current.status === 'DISCONNECTED') {
          current.status = 'RECONNECTING';
          this.establishConnection(chainId, current.url, true, nextAttempt);
        }
      }, delay);
    }

    systemEmitter.emit('RPC_ERROR', {
      type: 'DISCONNECT_WARNING',
      message: `WebSocket connection dropped on chain ${chainId}. Attempting re-connection...`,
      chainId
    });
  }

  /**
   * Safely registers a subscription/listener to the centralized provider.
   * Auto-restores if the WSS drops and reconnects.
   */
  public subscribe(chainId: number, listenerKey: string, filter: any, callback: (data: any) => void) {
    if (!this.registeredListeners.has(chainId)) {
      this.registeredListeners.set(chainId, new Map());
    }

    const listeners = this.registeredListeners.get(chainId)!;
    listeners.set(listenerKey, { filter, callback });

    const conn = this.connections.get(chainId);
    if (conn && conn.status === 'CONNECTED') {
      try {
        conn.provider.on(filter, callback);
        console.log(`[EVENT_ENGINE] Attached event listener: ${listenerKey} on chain ${chainId}`);
      } catch (e) {
        console.error(`[EVENT_ENGINE] Failed to attach listener ${listenerKey} on chain ${chainId}:`, e);
      }
    }
  }

  /**
   * Safely unsubscribes a listener by key.
   */
  public unsubscribe(chainId: number, listenerKey: string) {
    const listeners = this.registeredListeners.get(chainId);
    if (!listeners) return;

    const val = listeners.get(listenerKey);
    if (!val) return;

    listeners.delete(listenerKey);

    const conn = this.connections.get(chainId);
    if (conn && conn.provider) {
      try {
        conn.provider.off(val.filter, val.callback);
        console.log(`[EVENT_ENGINE] Detached event listener: ${listenerKey} from chain ${chainId}`);
      } catch (e) {}
    }
  }

  private restoreSubscriptions(chainId: number) {
    const conn = this.connections.get(chainId);
    const listeners = this.registeredListeners.get(chainId);

    if (!conn || conn.status !== 'CONNECTED' || !listeners) return;

    console.log(`[EVENT_ENGINE] Restoring ${listeners.size} active subscriptions on chain ${chainId}`);

    listeners.forEach((val, key) => {
      try {
        conn.provider.off(val.filter); // Clear stale hooks first
        conn.provider.on(val.filter, val.callback);
      } catch (e) {
        console.error(`[EVENT_ENGINE] Error restoring subscription ${key} on chain ${chainId}:`, e);
      }
    });
  }

  /**
   * Visibility-Aware Handler:
   * Disconnects sockets when tab goes hidden to avoid memory/battery drains.
   * Restores connections and triggers a re-sync when tab is visible again.
   */
  private handleVisibilityChange = () => {
    this.isTabVisible = !document.hidden;
    console.log(`[EVENT_ENGINE] Visibility event: App background paused: ${!this.isTabVisible}`);

    if (this.isTabVisible) {
      // Re-connect all registered sockets
      this.connections.forEach((conn, chainId) => {
        if (conn.status === 'DISCONNECTED') {
          console.log(`[EVENT_ENGINE] App resumed. Reconnecting WebSocket to chain ${chainId}...`);
          this.connect(chainId, conn.url);
        }
      });

      // Synchronize dashboard balances
      systemEmitter.emit('app_resumed', { timestamp: Date.now() });
    } else {
      // Tab hidden: Disconnect WSS to prevent background resource leaks
      this.connections.forEach((conn, chainId) => {
        if (conn.isWs) {
          console.log(`[EVENT_ENGINE] App backgrounded. Disconnecting WebSocket for chain ${chainId}.`);
          this.disconnect(chainId);
          // Restore as disconnected connection placeholder for recovery
          this.connections.set(chainId, {
            provider: new ethers.JsonRpcProvider(conn.url.replace('wss://', 'https://')),
            url: conn.url,
            isWs: false,
            status: 'DISCONNECTED',
            latency: 0,
            reconnectAttempts: 0
          });
        }
      });
    }
  };

  private setSigningState(isSigning: boolean) {
    this.isSigningTransaction = isSigning;
    console.log(`[EVENT_ENGINE] Event Engine suspension active: ${isSigning}`);
  }

  private startLatencyMonitoring() {
    this.latencyInterval = setInterval(() => {
      if (!this.isTabVisible || this.isSigningTransaction) return;

      this.connections.forEach(async (conn, chainId) => {
        if (conn.status !== 'CONNECTED') return;

        const start = performance.now();
        try {
          // Perform high-performance blockNumber pull to check RPC ping/latency
          await conn.provider.getBlockNumber();
          const latency = Math.round(performance.now() - start);
          conn.latency = latency;

          // Emit RPC telemetry metadata
          systemEmitter.emit('RPC_TELEMETRY', {
            id: `latency-${chainId}-${Date.now()}`,
            timestamp: Date.now(),
            url: conn.url.replace(/wss:\/\/|https:\/\//, '').split('/')[0],
            method: 'eth_blockNumber',
            duration: latency,
            status: 'SUCCESS',
            isDuplicate: false,
            isRateLimit: false,
            warnings: latency > 350 ? ['Slow Provider Node'] : [],
            chainId
          });
        } catch (e) {
          conn.latency = 9999;
          console.warn(`[EVENT_ENGINE] Latency ping failed on chain ${chainId}`);
        }
      });
    }, 12000); // Probe node speed every 12 seconds
  }

  /**
   * Returns provider instance for direct queries.
   */
  public getProvider(chainId: number): ethers.WebSocketProvider | ethers.JsonRpcProvider | null {
    const conn = this.connections.get(chainId);
    return conn && conn.status === 'CONNECTED' ? conn.provider : null;
  }

  public getConnectionStatus(chainId: number): 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'UNKNOWN' {
    const conn = this.connections.get(chainId);
    return conn ? conn.status : 'UNKNOWN';
  }

  public shutdown() {
    if (this.latencyInterval) {
      clearInterval(this.latencyInterval);
    }
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    Array.from(this.connections.keys()).forEach((id) => this.disconnect(id));
    this.connections.clear();
    this.registeredListeners.clear();
  }
}

export const blockchainEventEngine = BlockchainEventEngine.getInstance();
