import { EvmQuoteParams } from './zeroX';

export async function fetchParaswap({ fromToken, toToken, amount, user, chainId }: EvmQuoteParams) {
  const query = new URLSearchParams({
    srcToken: fromToken,
    destToken: toToken,
    amount: amount,
    side: 'SELL',
    network: chainId.toString(),
    userAddress: user || '0x0000000000000000000000000000000000000000'
  });

  const url = `https://apiv5.paraswap.io/prices/?${query.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Paraswap failed: ${err}`);
  }

  const data = await res.json();
  return data.priceRoute || data;
}
