import { EvmQuoteParams } from './types';

export async function fetchOdos({ chainId, fromToken, toToken, amount, user, slippage = 1 }: EvmQuoteParams) {
  // 1. Fetch Quote
  const quoteRes = await fetch("https://api.odos.xyz/sor/quote/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chainId,
      inputTokens: [{ tokenAddress: fromToken, amount: amount }],
      outputTokens: [{ tokenAddress: toToken, proportion: 1 }],
      userAddr: user || '0x0000000000000000000000000000000000000000',
      slippageLimitPercent: slippage,
      compact: true
    }),
  });

  if (!quoteRes.ok) {
    const err = await quoteRes.text();
    throw new Error(`Odos quote failed: ${err}`);
  }

  const quote = await quoteRes.json();
  return quote;
}

export async function assembleOdos(pathId: string, userAddr: string) {
  const res = await fetch("https://api.odos.xyz/sor/assemble", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pathId,
      userAddr
    }),
  });

  if (!res.ok) throw new Error("Odos assemble failed");
  return res.json();
}
