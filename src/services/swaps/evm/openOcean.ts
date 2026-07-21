import { EvmQuoteParams } from './types';

const CHAIN_MAP: Record<number, string> = {
  1: 'eth',
  137: 'polygon',
  56: 'bsc',
  42161: 'arbitrum',
  10: 'optimism',
  8453: 'base',
  43114: 'avax',
  250: 'fantom'
};

export async function fetchOpenOcean({ chainId, fromToken, toToken, amount, user, slippage = 1 }: EvmQuoteParams) {
  const chainName = CHAIN_MAP[chainId];
  if (!chainName) throw new Error(`OpenOcean unsupported chainId: ${chainId}`);

  const query = new URLSearchParams({
    inTokenAddress: fromToken,
    outTokenAddress: toToken,
    amount: amount,
    gasPrice: "50", // Standard gas price fallback
    slippage: slippage.toString(),
    account: user || '0x0000000000000000000000000000000000000000'
  });

  const url = `https://open-api.openocean.finance/v3/${chainName}/swap_quote?${query.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenOcean failed: ${err}`);
  }

  const data = await res.json();
  return data.data || data;
}
