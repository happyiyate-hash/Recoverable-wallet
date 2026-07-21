// src/lib/rpc/RpcInterceptor.ts
// Central interceptor for all outbound RPC activity. Wraps ethers providers and generic fetch calls.

import { systemEmitter } from '@/lib/events/systemEmitter';

export class RpcInterceptor {
  /**
   * Wrap an ethers JsonRpcProvider (or any object with a `send` method) to emit telemetry.
   * The wrapper proxies the original `send` method and emits request/response/error events.
   */
  static wrapProvider<T extends { send: (...args: any[]) => Promise<any> }>(provider: T): T {
    const originalSend = provider.send.bind(provider);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provider.send = async (method: string, params: any[]) => {
      const requestId = `${method}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      systemEmitter.emit('RPC_EVENT', {
        type: 'RPC_REQUEST',
        requestId,
        method,
        params,
        timestamp: Date.now()
      });
      try {
        const result = await originalSend(method, params);
        systemEmitter.emit('RPC_EVENT', {
          type: 'RPC_RESPONSE',
          requestId,
          method,
          result,
          timestamp: Date.now()
        });
        return result;
      } catch (error) {
        systemEmitter.emit('RPC_EVENT', {
          type: 'RPC_ERROR',
          requestId,
          method,
          error: (error as Error).message,
          timestamp: Date.now()
        });
        throw error;
      }
    };
    return provider;
  }

  /**
   * Helper to wrap native fetch calls. Returns a function with the same signature as window.fetch.
   */
  static wrapFetch(originalFetch: typeof fetch): typeof fetch {
    return async (input: RequestInfo, init?: RequestInit) => {
      const requestId = `fetch-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      systemEmitter.emit('RPC_EVENT', {
        type: 'RPC_REQUEST',
        requestId,
        method: 'fetch',
        input,
        init,
        timestamp: Date.now()
      });
      try {
        const response = await originalFetch(input, init);
        systemEmitter.emit('RPC_EVENT', {
          type: 'RPC_RESPONSE',
          requestId,
          method: 'fetch',
          status: response.status,
          ok: response.ok,
          timestamp: Date.now()
        });
        return response;
      } catch (error) {
        systemEmitter.emit('RPC_EVENT', {
          type: 'RPC_ERROR',
          requestId,
          method: 'fetch',
          error: (error as Error).message,
          timestamp: Date.now()
        });
        throw error;
      }
    };
  }
}
