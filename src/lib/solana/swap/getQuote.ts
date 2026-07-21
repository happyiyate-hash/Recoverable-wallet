
/**
 * JUPITER QUOTE DISCOVERY NODE
 * Version: 6.0.0 (Jupiter V6 Standard)
 * Fetches the optimal swap route from the Jupiter Aggregator.
 */

export async function getQuote({
  inputMint,
  outputMint,
  amount,
  slippageBps = 50
}: {
  inputMint: string;
  outputMint: string;
  amount: string; // Smallest unit (lamports)
  slippageBps?: number;
}) {
  const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data || !data.outAmount) {
      throw new Error(data.error || "No liquidity route found for this Solana pair.");
    }

    return data; // Jupiter V6 returns the best route object directly
  } catch (error: any) {
    console.error("[SOLANA_QUOTE_FAIL]", error.message);
    throw error;
  }
}
