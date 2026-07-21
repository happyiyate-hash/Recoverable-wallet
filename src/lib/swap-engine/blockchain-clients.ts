/**
 * INSTITUTIONAL BLOCKCHAIN ADAPTERS
 * Version: 1.0.0
 * Authority: Blueprint File 3
 * 
 * Replaces dummy placeholders with live adminExecutor and gasService hooks.
 */

import { SwapTransaction } from './types';
import { adminExecutor } from '../services/admin-executor';
import { gasService } from '@/services/gasService';

/**
 * Fetch real-time gas fee for a chain node
 */
export async function getGasFee(chainName: string): Promise<number> {
  const gasData = gasService.getGasPrice(chainName);
  return gasData?.usdFee || 0.05;
}

/**
 * Sign and broadcast transaction from Admin Vault
 */
export async function sendTransaction(tx: SwapTransaction): Promise<string> {
  // Resolve protocol type from chain name
  let chainType = 'evm';
  const name = tx.chain.toLowerCase();
  
  if (name.includes('solana')) chainType = 'solana';
  else if (name.includes('xrp')) chainType = 'xrp';
  else if (name.includes('tron')) chainType = 'tron';

  return await adminExecutor.executeAdminTransfer({
    toAddress: tx.to,
    amount: tx.amount,
    tokenSymbol: tx.tokenSymbol,
    tokenAddress: tx.tokenAddress,
    chainId: 1, // Mainnet standard
    chainType
  });
}
