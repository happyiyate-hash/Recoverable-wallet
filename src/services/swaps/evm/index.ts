import { EVM_PROVIDERS } from './providers';
import { EvmQuoteParams, SwapQuote, ProviderId } from './types';
import { ethers } from 'ethers';

// 🛡️ SESSION HEALTH TRACKER
// Tracks reliability metrics for the current session to favor healthy nodes.
const sessionHealth: Record<string, number> = {};

function withTimeout<T>(promise: Promise<T>, ms = 4500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout [${ms}ms]`)), ms))
  ]);
}

interface BestQuoteOptions extends EvmQuoteParams {
  toTokenDecimals: number;
  toTokenPrice: number;
}

/**
 * MASTER EVM QUOTE AGGREGATOR (HARDENED)
 * Parallelizes discovery across verified liquidity nodes with strict reliability guards.
 */
export async function getEvmQuotes(params: BestQuoteOptions): Promise<SwapQuote[]> {
  console.log(`[EVM_ROUTER] Parallel Probing Initialized: Chain ${params.chainId}`);

  // 1. Parallel Dispatch (with individual timeouts)
  const results = await Promise.allSettled(
    EVM_PROVIDERS.map(provider => withTimeout(provider.getQuote(params)))
  );

  // 2. Normalize, Hydrate & Score
  const validQuotes: SwapQuote[] = results
    .map((res, index) => {
      const provider = EVM_PROVIDERS[index];
      const health = sessionHealth[provider.id] ?? 1.0;

      if (res.status === 'fulfilled' && res.value) {
        const quote = res.value;
        
        // Hydrate Receive Amount
        const receiveAmount = parseFloat(ethers.formatUnits(quote.toAmount, params.toTokenDecimals));
        quote.receiveAmount = receiveAmount;
        quote.healthScore = health;

        // 3. Scoring Engine (Hardened)
        // Score = (OutputValue - GasCost) * HealthMultiplier
        const outputValue = receiveAmount * params.toTokenPrice;
        const gasCost = quote.gasUsd * 1.2;
        quote.score = (outputValue - gasCost) * health;

        console.log(`[EVM_ROUTER] Discovery: ${provider.name} -> ${receiveAmount.toFixed(4)} (Score: ${quote.score.toFixed(2)}, Health: ${health.toFixed(2)})`);
        
        // Boost health on success
        sessionHealth[provider.id] = Math.min((sessionHealth[provider.id] || 1.0) + 0.05, 1.0);
        
        return quote;
      } else {
        const error = res.status === 'rejected' ? res.reason?.message : 'No liquidity';
        console.warn(`[EVM_ROUTER] Node ${provider.name} offline: ${error}`);
        
        // Penalize health on failure/timeout
        sessionHealth[provider.id] = Math.max((sessionHealth[provider.id] || 1.0) - 0.2, 0.4);
        
        return null;
      }
    })
    .filter((q): q is SwapQuote => q !== null);

  if (validQuotes.length === 0) {
    throw new Error("Registry Alert: All liquidity nodes reported zero depth or timed out.");
  }

  // 4. Sort by Score (Weighted by Health)
  return validQuotes.sort((a, b) => b.score - a.score);
}
