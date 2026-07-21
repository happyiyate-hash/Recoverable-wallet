import { ReadyTransactionRequest } from '@/services/swapService';

export class SmartSwapEngine {
  /**
   * Calculate a safe slippage based on token symbols.
   * Returns a decimal (e.g., 0.005 for 0.5%).
   */
  static calculateDynamicSlippage(fromSymbol: string, toSymbol: string): number {
    const stable = ['USDC', 'USDT', 'DAI', 'PYUSD'];
    const majors = ['ETH', 'WETH', 'WBTC', 'BNB', 'MATIC', 'ARB', 'SOL'];
    const from = fromSymbol?.toUpperCase?.() ?? '';
    const to = toSymbol?.toUpperCase?.() ?? '';
    if (stable.includes(from) && stable.includes(to)) return 0.001; // 0.1%
    if (majors.includes(from) && majors.includes(to)) return 0.005; // 0.5%
    return 0.015; // 1.5% fallback for volatile pairs
  }

  /**
   * Guarded gas safety buffer. Returns a stringified gas limit.
   */
  static applyGasSafetyBuffer(rawEstimatedGas: string | null | undefined): string {
    if (!rawEstimatedGas || rawEstimatedGas === '0' || rawEstimatedGas === '') {
      return '21000'; // fallback for simple transfers
    }
    try {
      const estimated = BigInt(rawEstimatedGas);
      const buffered = (estimated * 120n) / 100n; // 20% buffer
      return buffered.toString();
    } catch (e) {
      console.warn('Gas buffer calc failed, using raw value', e);
      return rawEstimatedGas ?? '21000';
    }
  }

  /**
   * Optimise a ReadyTransactionRequest using the gas safety buffer.
   */
  static optimizeTransactionRequest(raw: ReadyTransactionRequest): ReadyTransactionRequest {
    return {
      ...raw,
      estimatedGas: this.applyGasSafetyBuffer(raw.estimatedGas),
    };
  }
}
