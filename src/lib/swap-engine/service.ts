/**
 * INSTITUTIONAL SWAP SERVICE
 * Version: 1.1.0 (Multi-Token Price Sync)
 * Authority: Blueprint File 5
 */

import { SwapRequest, SwapResponse } from './types';
import { calculateFees, generateSwapHash } from './utils';
import { getGasFee } from './blockchain-clients';

export async function prepareSwap(
  request: SwapRequest, 
  fromTokenPrice: number,
  toTokenPrice: number
): Promise<SwapResponse> {
  // 1. Fetch real-time gas node for destination
  const gasFeeUsd = await getGasFee(request.destinationChain);

  // 2. Execute deterministic fee calculation
  const { adminFeeUsd, gasFeeUsd: gUsd, totalFee, destinationAmount } = calculateFees(
    request.sourceAmount, 
    fromTokenPrice,
    toTokenPrice,
    gasFeeUsd
  );

  // 3. Generate unique registry hash for audit trail
  const swapHash = generateSwapHash(request);

  return {
    swapHash,
    fees: { 
      adminFee: adminFeeUsd / (toTokenPrice || 1), 
      gasFee: gUsd / (toTokenPrice || 1), 
      totalFee 
    },
    destinationAmount,
    status: 'pending'
  };
}
