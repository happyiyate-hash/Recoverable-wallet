export enum ProviderId {
  PARASWAP = 'PARASWAP',
  ZEROX = 'ZEROX',
  ONEINCH = 'ONEINCH',
  LIFI = 'LIFI',
  OPENOCEAN = 'OPENOCEAN',
  ODOS = 'ODOS'
}

export interface EvmQuoteParams {
  chainId: number;
  fromToken: string;
  toToken: string;
  amount: string;
  user?: string;
  slippage?: number;
}

export interface RouteStep {
  type: 'swap' | 'bridge' | 'wrap' | 'unwrap';
  provider: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  description: string;
}

export interface SwapQuote {
  id: string;
  providerId: ProviderId;
  providerName: string;
  logo: string | null;
  toAmount: string;
  receiveAmount: number;
  gas: string;
  gasUsd: number;
  fee: number;
  eta: string;
  rawQuote: any;
  score: number;
  source: string;
  
  // Hardening Phase Additions
  expiresAt: number;        // Timestamp (ms)
  steps: RouteStep[];      // For multi-hop/bridge transparency
  healthScore?: number;    // 0-1 dynamic reliability metric
  allowanceTarget: string | null; // Spender address for approvals
}

export interface EVMProvider {
  id: ProviderId;
  name: string;
  getQuote(params: EvmQuoteParams): Promise<SwapQuote | null>;
  buildTransaction(quote: any, userAddress: string): Promise<any>;
}
