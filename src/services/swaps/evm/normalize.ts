import { ProviderId, SwapQuote } from './types';

const PROVIDER_LOGOS: Record<string, string> = {
  '0x': 'https://0x.org/images/0x-logo.png',
  '1inch': 'https://1inch.io/img/logo.png',
  'paraswap': 'https://www.paraswap.io/assets/paraswap-logo.svg',
  'lifi': 'https://li.fi/logos/lifi.svg',
  'sunswap': 'https://sunswap.com/logo.png',
  'openocean': 'https://openocean.finance/static/img/logo.png',
  'odos': 'https://odos.xyz/favicon.ico'
};

const PROVIDER_IDS: Record<string, ProviderId> = {
  '0x': ProviderId.ZEROX,
  '1inch': ProviderId.ONEINCH,
  'paraswap': ProviderId.PARASWAP,
  'lifi': ProviderId.LIFI,
  'openocean': ProviderId.OPENOCEAN,
  'odos': ProviderId.ODOS
};

const PROVIDER_NAMES: Record<string, string> = {
  '0x': '0x Protocol',
  '1inch': '1inch Aggregator',
  'paraswap': 'ParaSwap Router',
  'lifi': 'LI.FI Bridge',
  'openocean': 'OpenOcean',
  'odos': 'Odos Router'
};

export function normalizeQuote(raw: any, provider: string): SwapQuote | null {
  if (!raw) return null;

  const pKey = provider.toLowerCase();
  const providerId = PROVIDER_IDS[pKey] || ProviderId.ZEROX;
  const gas = raw.estimatedGas || raw.gas || 0;
  const gasPrice = raw.gasPrice || "0";
  const gasUsd = (parseFloat(gas) * parseFloat(gasPrice)) / 1e18 * 2500; 
  const toAmount = raw.buyAmount || raw.toTokenAmount || raw.destAmount || "0";

  const allowanceTarget = raw.allowanceTarget || raw.tokenTransferProxy || raw.to || raw.spender || null;

  return {
    id: `${provider}-${Date.now()}`,
    providerId: providerId,
    providerName: PROVIDER_NAMES[pKey] || provider.toUpperCase(),
    logo: PROVIDER_LOGOS[pKey] || null,
    toAmount: toAmount,
    receiveAmount: 0, // Will be set by index.ts with decimals
    gas: gas.toString(),
    gasUsd: gasUsd || 0.15,
    fee: 0.01,
    eta: pKey === 'lifi' ? '~3m' : '~15s',
    rawQuote: raw,
    score: 0, // Will be calculated in index.ts
    source: provider,
    
    // Hardening Additions
    expiresAt: Date.now() + 60000, // 60s TTL
    steps: [{
      type: 'swap',
      provider: PROVIDER_NAMES[pKey] || provider,
      fromToken: raw.sellToken || raw.fromTokenAddress || 'Source',
      toToken: raw.buyToken || raw.toTokenAddress || 'Dest',
      fromAmount: raw.sellAmount || raw.fromTokenAmount || '0',
      toAmount: toAmount,
      description: `Swap via ${PROVIDER_NAMES[pKey] || provider}`
    }],
    healthScore: 1.0, // Initialized to perfect health
    allowanceTarget: allowanceTarget
  };
}
