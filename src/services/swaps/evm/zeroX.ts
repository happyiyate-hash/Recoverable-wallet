const ZEROX_BASE: Record<number, string> = {
  1: "https://api.0x.org",
  137: "https://polygon.api.0x.org",
  56: "https://bsc.api.0x.org",
  42161: "https://arbitrum.api.0x.org",
  10: "https://optimism.api.0x.org",
  8453: "https://base.api.0x.org"
};

export interface EvmQuoteParams {
  chainId: number;
  fromToken: string;
  toToken: string;
  amount: string;
  user?: string;
  slippage?: number;
}

export async function fetch0x({ fromToken, toToken, amount, user, chainId, slippage = 1 }: EvmQuoteParams) {
  const base = ZEROX_BASE[chainId];
  if (!base) throw new Error(`0x unsupported chainId: ${chainId}`);

  const url = new URL(`${base}/swap/v1/quote`);
  url.searchParams.append('sellToken', fromToken);
  url.searchParams.append('buyToken', toToken);
  url.searchParams.append('sellAmount', amount);
  url.searchParams.append('slippagePercentage', (slippage / 100).toString());
  
  if (user) {
    url.searchParams.append('takerAddress', user);
  }

  const headers: Record<string, string> = {};
  if (process.env.NEXT_PUBLIC_ZEROX_API_KEY) {
      headers['0x-api-key'] = process.env.NEXT_PUBLIC_ZEROX_API_KEY;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`0x failed: ${err}`);
  }

  return res.json();
}
