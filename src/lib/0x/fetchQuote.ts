/**
 * ⚠️ IMPORTANT INSTRUCTION:
 * - Only implement quote fetching and swap execution for same-chain swaps.
 * - Use the "Clean" native fetch implementation with raw error display.
 * - Sanitizes ETH addresses for 0x Protocol compliance.
 */

const ZEROX_API_KEY = "5eebaf6f-e024-41d2-a18f-e05c241129c3";

const ZEROX_URLS: Record<number, string> = {
  1: "https://api.0x.org",
  137: "https://polygon.api.0x.org",
  56: "https://bsc.api.0x.org",
  10: "https://optimism.api.0x.org",
  42161: "https://arbitrum.api.0x.org",
  43114: "https://avalanche.api.0x.org",
  8453: "https://base.api.0x.org",
  250: "https://fantom.api.0x.org",
  42220: "https://celo.api.0x.org"
};

export async function fetch0xQuote(sellToken: string, buyToken: string, sellAmount: string, takerAddress: string, chainId: number = 1): Promise<any> {
  try {
    // 0x Protocol requires 'ETH' symbol for native assets rather than the 0xeeee... address
    const cleanSellToken = (sellToken.toLowerCase() === 'eth' || sellToken === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') ? 'ETH' : sellToken;
    const cleanBuyToken = (buyToken.toLowerCase() === 'eth' || buyToken === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') ? 'ETH' : buyToken;

    const baseUrl = ZEROX_URLS[chainId] || "https://api.0x.org";

    const params = new URLSearchParams({
      sellToken: cleanSellToken,
      buyToken: cleanBuyToken,
      sellAmount,
      takerAddress,
      slippagePercentage: '0.01' // Default 1% slippage
    });

    const response = await fetch(
      `${baseUrl}/swap/v1/quote?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "0x-api-key": ZEROX_API_KEY
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("0x RAW ERROR:", data);
      if (data?.reason) throw new Error(`0x: ${data.reason}`);
      if (data?.validationErrors?.length) throw new Error(`0x: ${data.validationErrors[0].reason}`);
      throw new Error(`0x API Error: ${response.statusText}`);
    }

    return data;
  } catch (error: any) {
    if (!error.message?.startsWith('0x')) {
       console.error("0x RAW ERROR:", error.message);
    }
    throw error;
  }
}
