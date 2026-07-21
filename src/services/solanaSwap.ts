'use client';

import { Connection, VersionedTransaction, Keypair } from '@solana/web3.js';
import axios from 'axios';

/**
 * INSTITUTIONAL SOLANA JUPITER SWAP SERVICE
 * Version: 4.0.0 (Jupiter V6 Standard)
 * 
 * Orchestrates best-price swaps on Solana using Jupiter aggregation.
 */

const JUP_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
const JUP_SWAP_API = 'https://quote-api.jup.ag/v6/swap';

export interface JupiterResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetches a swap quote from Jupiter.
 * Uses mint addresses and smallest units (lamports/decimals).
 */
export async function getSolanaSwapQuote(
  inputMint: string, 
  outputMint: string, 
  amount: string, 
  slippageBps: number = 50
): Promise<JupiterResponse<any>> {
  try {
    const params = {
      inputMint,
      outputMint,
      amount,
      slippageBps,
      onlyDirectRoutes: false,
    };

    const res = await axios.get(JUP_QUOTE_API, { params, timeout: 10000 });
    const quote = res.data;
    
    if (quote.error) throw new Error(quote.error);

    return { success: true, data: quote };
  } catch (error: any) {
    console.error("[JUPITER_QUOTE_FAIL]", error.message);
    return { success: false, error: error.message || "No Solana route found." };
  }
}

/**
 * Builds the swap transaction node via Jupiter API.
 */
export async function buildSolanaSwapTransaction(quoteResponse: any, userPublicKey: string): Promise<JupiterResponse<string>> {
  try {
    const res = await axios.post(JUP_SWAP_API, {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto'
    }, { timeout: 10000 });

    const { swapTransaction } = res.data;
    return { success: true, data: swapTransaction };
  } catch (error: any) {
    console.error("[JUPITER_BUILD_FAIL]", error.message);
    return { success: false, error: error.message || "Handshake failed." };
  }
}

/**
 * Signs and broadcasts the swap transaction.
 */
export async function executeSolanaSwap(
  swapTransaction: string, 
  privateKeyHex: string, 
  rpcUrl: string
): Promise<string> {
  const connection = new Connection(rpcUrl, 'confirmed');
  const signer = Keypair.fromSecretKey(new Uint8Array(Buffer.from(privateKeyHex, 'hex')));
  
  try {
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    
    // ATOMIC SIGNING
    transaction.sign([signer]);
    
    // DISPATCH
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: true,
      maxRetries: 3,
    });
    
    // VERIFY SETTLEMENT
    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
  } catch (error: any) {
    console.error("[SOLANA_BROADCAST_FAIL]", error.message);
    throw new Error(error.message || "Solana broadcast failed.");
  }
}
