import { EvmQuoteParams } from './zeroX';

export async function fetch1inch({ chainId, fromToken, toToken, amount, user, slippage = 1 }: EvmQuoteParams) {
  // 1inch v5.0 requireschainId in the URL path
  const base = `https://api.1inch.io/v5.0/${chainId}`;

  const query = new URLSearchParams({
    fromTokenAddress: fromToken,
    toTokenAddress: toToken,
    amount: amount,
    fromAddress: user || '0x0000000000000000000000000000000000000000',
    slippage: slippage.toString(),
    disableEstimate: "false"
  });

  const url = `${base}/swap?${query.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`1inch failed: ${err}`);
  }

  return res.json();
}
