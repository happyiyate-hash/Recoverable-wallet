/**
 * INSTITUTIONAL SWAP VALIDATOR
 * Version: 1.0.0
 * Authority: Blueprint File 4
 */

import { SwapRequest } from './types';
import { isSwapSupported } from '../services/swap-router';

export function validateSwapRequest(request: SwapRequest, fromChainId: number, toChainId: number): string | null {
  // 1. Check Institutional Support
  if (!isSwapSupported(fromChainId)) {
    return `Source chain node ${request.sourceChain} is not verified.`;
  }
  if (!isSwapSupported(toChainId)) {
    return `Destination chain node ${request.destinationChain} is not verified.`;
  }

  // 2. ENFORCE CROSS-CHAIN MANDATE
  if (fromChainId === toChainId) {
    return 'Swap not available — only chain-to-chain swaps supported.';
  }

  // 3. Amount Audit
  if (request.sourceAmount <= 0) {
    return 'Authorization amount must be greater than zero.';
  }

  return null; // Valid Node
}
