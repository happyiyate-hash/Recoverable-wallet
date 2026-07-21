import { ProviderId, EVMProvider, EvmQuoteParams, SwapQuote } from './types';
import { normalizeQuote } from './normalize';
import { fetch0x } from './zeroX';
import { fetch1inch } from './oneInch';
import { fetchParaswap } from './paraswap';

export const ZeroXProvider: EVMProvider = {
  id: ProviderId.ZEROX,
  name: '0x Protocol',
  async getQuote(params: EvmQuoteParams): Promise<SwapQuote | null> {
    try {
      const raw = await fetch0x(params);
      return normalizeQuote(raw, '0x');
    } catch (e) {
      console.warn("[ZeroXProvider] Quote fetch failed", e);
      return null;
    }
  },
  async buildTransaction(quote: any, userAddress: string): Promise<any> {
    const tx = quote.tx || quote.rawQuote;
    if (!tx.to || !tx.data) throw new Error("0x transaction data missing");
    return {
      to: tx.to,
      data: tx.data,
      value: tx.value || "0",
      gasLimit: tx.gas || undefined,
    };
  }
};

export const ParaSwapProvider: EVMProvider = {
  id: ProviderId.PARASWAP,
  name: 'ParaSwap',
  async getQuote(params: EvmQuoteParams): Promise<SwapQuote | null> {
    try {
      const raw = await fetchParaswap(params);
      return normalizeQuote(raw, 'paraswap');
    } catch (e) {
      console.warn("[ParaSwapProvider] Quote fetch failed", e);
      return null;
    }
  },
  async buildTransaction(quote: any, userAddress: string): Promise<any> {
    const tx = quote.tx || quote.rawQuote;
    const res = await fetch("https://apiv5.paraswap.io/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        srcToken: tx.srcToken,
        destToken: tx.destToken,
        srcAmount: tx.srcAmount,
        userAddress,
        priceRoute: tx
      }),
    });
    
    if (!res.ok) throw new Error("Paraswap transaction build failed");
    const built = await res.json();
    return {
      to: built.to,
      data: built.data,
      value: built.value || "0",
      gasLimit: built.gas || undefined,
    };
  }
};

export const OneInchProvider: EVMProvider = {
  id: ProviderId.ONEINCH,
  name: '1inch',
  async getQuote(params: EvmQuoteParams): Promise<SwapQuote | null> {
    try {
      const raw = await fetch1inch(params);
      return normalizeQuote(raw, '1inch');
    } catch (e) {
      console.warn("[OneInchProvider] Quote fetch failed", e);
      return null;
    }
  },
  async buildTransaction(quote: any, userAddress: string): Promise<any> {
    const tx = quote.tx || quote.rawQuote;
    const data = tx.tx || tx;
    return {
      to: data.to,
      data: data.data,
      value: data.value || "0",
      gasLimit: data.gas || undefined,
    };
  }
};

import { fetchOpenOcean } from './openOcean';
import { fetchOdos, assembleOdos } from './odos';

export const OpenOceanProvider: EVMProvider = {
  id: ProviderId.OPENOCEAN,
  name: 'OpenOcean',
  async getQuote(params: EvmQuoteParams): Promise<SwapQuote | null> {
    try {
      const raw = await fetchOpenOcean(params);
      return normalizeQuote(raw, 'openocean');
    } catch (e) {
      console.warn("[OpenOceanProvider] Quote fetch failed", e);
      return null;
    }
  },
  async buildTransaction(quote: any, userAddress: string): Promise<any> {
    const tx = quote.tx || quote.rawQuote;
    return {
      to: tx.to,
      data: tx.data,
      value: tx.value || "0",
      gasLimit: tx.gas || undefined,
    };
  }
};

export const OdosProvider: EVMProvider = {
  id: ProviderId.ODOS,
  name: 'Odos',
  async getQuote(params: EvmQuoteParams): Promise<SwapQuote | null> {
    try {
      const raw = await fetchOdos(params);
      return normalizeQuote(raw, 'odos');
    } catch (e) {
      console.warn("[OdosProvider] Quote fetch failed", e);
      return null;
    }
  },
  async buildTransaction(quote: any, userAddress: string): Promise<any> {
    const raw = quote.rawQuote;
    const assembled = await assembleOdos(raw.pathId, userAddress);
    const tx = assembled.transaction;
    return {
      to: tx.to,
      data: tx.data,
      value: tx.value || "0",
      gasLimit: tx.gas || undefined,
    };
  }
};

export const EVM_PROVIDERS: EVMProvider[] = [
  ZeroXProvider,
  ParaSwapProvider,
  OneInchProvider,
  OpenOceanProvider,
  OdosProvider
];
