/**
 * INSTITUTIONAL SWAP WORKER
 * Version: 1.0.0
 * Authority: Blueprint File 6
 */

import { SwapTransaction } from './types';
import { sendTransaction } from './blockchain-clients';

/**
 * Executes a prepared settlement using admin signing authority
 * Returns the blockchain transaction hash
 */
export async function executeSwap(tx: SwapTransaction): Promise<string> {
  try {
    console.log(`[SWAP_WORKER] Executing payout for ${tx.amount} ${tx.tokenSymbol} on ${tx.chain}...`);
    const txHash = await sendTransaction(tx);
    return txHash; 
  } catch (err: any) {
    console.error('[SWAP_WORKER_FAIL]', err.message);
    throw err;
  }
}
