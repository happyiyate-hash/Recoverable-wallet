
import axios from "axios";
import { ethers } from "ethers";

/**
 * INSTITUTIONAL 0X SWAP MODULE
 * Version: 1.0.0 (Backend Clean Standard)
 * 
 * Rules:
 * 1. ONLY Same-Chain EVM swaps.
 * 2. Display RAW errors for debugging.
 * 3. Use hardcoded institutional API key.
 */

const ZEROX_API_KEY = "5eebaf6f-e024-41d2-a18f-e05c241129c3";

/**
 * Fetches a quote from the 0x API.
 * Ensures raw error propagation for institutional debugging.
 */
export async function fetch0xQuote({
  sellToken,
  buyToken,
  sellAmount,
  takerAddress
}: {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  takerAddress: string;
}) {
  try {
    const response = await axios.get(
      "https://api.0x.org/swap/v1/quote",
      {
        params: {
          sellToken,
          buyToken,
          sellAmount,
          takerAddress
        },
        headers: {
          "0x-api-key": ZEROX_API_KEY
        }
      }
    );

    return response.data;
  } catch (error: any) {
    // INSTITUTIONAL DEBUG NODE: Never hide the raw API response
    console.error("0x RAW ERROR:", error?.response?.data || error.message);
    throw error?.response?.data || error.message;
  }
}

/**
 * Executes the swap transaction using a private key and RPC node.
 * This is intended for backend/server-side execution environments.
 */
export async function execute0xSwap(
  quote: any,
  privateKey: string,
  rpcUrl: string
) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const tx = {
      to: quote.to,
      data: quote.data,
      value: quote.value,
      gasLimit: quote.gas
    };

    const transaction = await wallet.sendTransaction(tx);
    const receipt = await transaction.wait();

    return receipt;
  } catch (error: any) {
    console.error("0x EXECUTION RAW ERROR:", error.message);
    throw error;
  }
}
