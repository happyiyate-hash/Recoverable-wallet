/**
 * INSTITUTIONAL SWAP UTILITIES
 * Version: 1.1.0 (1% + $0.01 + DestGas Standard)
 * Authority: Blueprint File 2
 */

import { SwapRequest } from './types';
import crypto from 'crypto';

/**
 * Generate a unique swap hash for registry tracking
 */
export function generateSwapHash(request: SwapRequest): string {
  const hashInput = `${request.userId}-${request.sourceChain}-${request.destinationChain}-${Date.now()}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Calculate deterministic fees and payout
 * Rule: Final = (InputAmount * Price - (1% AdminFee + $0.01 Buffer + GasUsd)) / TargetPrice
 */
export function calculateFees(
  sourceAmount: number, 
  fromTokenPrice: number,
  toTokenPrice: number,
  gasFeeUsd: number
) {
  const totalValueUsd = sourceAmount * fromTokenPrice;
  
  // 1. Calculate Fees in USD
  const adminFeeUsd = totalValueUsd * 0.01;
  const bufferFeeUsd = 0.01;
  const totalFeesUsd = adminFeeUsd + bufferFeeUsd + gasFeeUsd;

  // 2. Convert USD fees to Token units
  const divisor = toTokenPrice || 1;
  const totalFeeInToken = totalFeesUsd / divisor;
  
  const destinationAmount = Math.max(0, sourceAmount * (fromTokenPrice / divisor) - totalFeeInToken);

  return { 
    adminFeeUsd, 
    bufferFeeUsd,
    gasFeeUsd,
    totalFee: totalFeeInToken, 
    destinationAmount 
  };
}
