
/**
 * ⚠️ IMPORTANT INSTRUCTION:
 * - Use the "Clean" implementation for swap execution.
 * - Supports both client-side signer and backend privateKey patterns.
 */

import { ethers } from 'ethers';

export async function execute0xSwap(quote: any, signer: ethers.Signer) {
  try {
    const tx = {
      to: quote.to,
      data: quote.data,
      value: quote.value || '0x0',
      gasLimit: quote.gas ? BigInt(quote.gas) : undefined,
    };

    const transactionResponse = await signer.sendTransaction(tx);
    return transactionResponse.wait();
  } catch (error: any) {
    console.error("0x EXECUTION ERROR:", error.message);
    throw error;
  }
}
