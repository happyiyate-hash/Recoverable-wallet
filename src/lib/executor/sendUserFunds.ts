/**
 * INSTITUTIONAL FINAL PAYOUT EXECUTOR
 * Version: 1.0.0
 * 
 * Orchestrates the final 98.9% user payout and 1.1% admin fee split.
 */

import { adminExecutor } from '../services/admin-executor';

export async function sendUserFunds(
  userAddress: string,
  amount: number,
  asset: string,
  chainId: number,
  chainType: string,
  tokenAddress?: string
) {
  const userAmount = amount * 0.989; // 98.9% after fee
  const feeAmount = amount * 0.011; // 1.1% admin fee

  const adminVault = process.env.ADMIN_FEE_WALLET || '0x7f3f4206017C0aACF7A94C9eF7B80563984aD288';

  // 1. DISPATCH TO USER
  const userTx = await adminExecutor.executeAdminTransfer({
    toAddress: userAddress,
    amount: userAmount,
    tokenSymbol: asset,
    tokenAddress: tokenAddress,
    chainId: chainId,
    chainType: chainType
  });

  // 2. DISPATCH FEE TO ADMIN
  const feeTx = await adminExecutor.executeAdminTransfer({
    toAddress: adminVault,
    amount: feeAmount,
    tokenSymbol: asset,
    tokenAddress: tokenAddress,
    chainId: chainId,
    chainType: chainType
  }).catch(e => {
    console.warn("[FEE_SETTLEMENT_ADVISORY] Admin fee leg deferred.");
    return null;
  });

  return { userTx, feeTx };
}
