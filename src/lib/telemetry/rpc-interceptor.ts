'use client';

import { systemEmitter } from '../events/systemEmitter';

interface RpcRequestData {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  params: any;
  batchSize: number;
  chain?: string;
}

interface RpcTelemetryData extends RpcRequestData {
  duration: number;
  status: 'SUCCESS' | 'ERROR';
  isDuplicate: boolean;
  isRateLimit: boolean;
  statusCode?: number;
  warnings: string[];
}

let isInitialized = false;
let originalFetch: typeof window.fetch | null = null;

// Rolling window for duplicate detection
const RECENT_REQUESTS_WINDOW = 2000; // 2 seconds
const recentRequests: Array<{ payloadHash: string; timestamp: number }> = [];

export function initRpcTelemetry() {
  if (typeof window === 'undefined') return;
  if (isInitialized) return;
  
  // Always initialize interceptor in development mode
  isInitialized = true;
  originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    // 1. FAST EXIT FOR NON-RPC TRAFFIC
    if (!init || !init.body || init.method !== 'POST') {
      return originalFetch!(input, init);
    }

    const urlStr = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
    
    // Quick filter to ignore known non-RPC endpoints (supabase, analytics, etc)
    if (
      urlStr.includes('supabase.co') || 
      urlStr.includes('google-analytics') || 
      urlStr.includes('ingest') ||
      urlStr.includes('/api/auth')
    ) {
      return originalFetch!(input, init);
    }

    let isRpc = false;
    let rpcMethod = 'unknown';
    let rpcParams: any = null;
    let batchSize = 1;
    let payloadHash = '';
    
    try {
      const bodyStr = typeof init.body === 'string' ? init.body : null;
      if (bodyStr) {
        const parsed = JSON.parse(bodyStr);
        // Single request vs Batch request
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && parsed[0].jsonrpc) {
            isRpc = true;
            batchSize = parsed.length;
            rpcMethod = 'batch_multicall';
            payloadHash = hashCode(bodyStr).toString();
          }
        } else if (parsed.jsonrpc) {
          isRpc = true;
          rpcMethod = parsed.method || 'unknown';
          rpcParams = parsed.params;
          payloadHash = hashCode(bodyStr).toString();
        }
      }
    } catch (e) {
      // Not JSON or parse error, ignore safely
    }

    if (!isRpc) {
      return originalFetch!(input, init);
    }

    // 2. DUPLICATE DETECTION
    const now = Date.now();
    let isDuplicate = false;
    const warnings: string[] = [];

    // Clean old requests from window
    while (recentRequests.length > 0 && now - recentRequests[0].timestamp > RECENT_REQUESTS_WINDOW) {
      recentRequests.shift();
    }

    const duplicateCount = recentRequests.filter(r => r.payloadHash === payloadHash).length;
    if (duplicateCount > 0) {
      isDuplicate = true;
      if (duplicateCount > 2) {
        warnings.push('Duplicate Request Storm');
      } else {
        warnings.push('Redundant Fetch');
      }
    }

    recentRequests.push({ payloadHash, timestamp: now });

    if (batchSize > 10) {
       warnings.push('High RPC Burst');
    }

    const reqData: RpcRequestData = {
      id: Math.random().toString(36).substring(7),
      timestamp: now,
      url: urlStr,
      method: rpcMethod,
      params: rpcParams,
      batchSize,
    };

    // 3. EXECUTE AND MEASURE
    const startTime = performance.now();
    try {
      const response = await originalFetch!(input, init);
      const duration = performance.now() - startTime;
      const isRateLimit = response.status === 429;
      
      if (isRateLimit) warnings.push('429 Risk');

      const telemetry: RpcTelemetryData = {
        ...reqData,
        duration: Math.round(duration),
        status: response.ok ? 'SUCCESS' : 'ERROR',
        isDuplicate,
        isRateLimit,
        statusCode: response.status,
        warnings,
      };

      // Safely emit without throwing
      try {
        systemEmitter.emit('RPC_TELEMETRY', telemetry);
      } catch (e) {
        // Suppress emitter errors
      }

      return response;
    } catch (error: any) {
      const duration = performance.now() - startTime;
      const telemetry: RpcTelemetryData = {
        ...reqData,
        duration: Math.round(duration),
        status: 'ERROR',
        isDuplicate,
        isRateLimit: false,
        warnings,
      };

      try {
        systemEmitter.emit('RPC_TELEMETRY', telemetry);
      } catch (e) {
        // Suppress
      }

      throw error; // Re-throw to not break app runtime
    }
  };
}

export function restoreFetch() {
  if (originalFetch && typeof window !== 'undefined') {
    window.fetch = originalFetch;
    isInitialized = false;
  }
}

// Simple fast string hashing for duplicate detection
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
      let chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
