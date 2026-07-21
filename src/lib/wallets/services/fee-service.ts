'use client';

import { ethers } from 'ethers';
import axios from 'axios';
import * as xrpl from 'xrpl';
import { Connection } from '@solana/web3.js';
import evmNetworks from '@/lib/evmNetworks.json';
import { ChainConfig } from '@/lib/types';

/**
 * INSTITUTIONAL GAS FEE SERVICE
 * Version: 4.1.1 (Fixed Polygon Gas Station Rate Limit)
 */

export interface FeeResult {
  gasPriceGwei?: string;
  nativeFee: string;
  usdFee: number;
  estimatedTime: string;
  satPerVByte?: number; // UTXO specific
  estimatedFeeNative?: string;
  estimatedFeeUSD: number;
}

/**
 * Helper to fetch gas fees by chain key or symbol.
 */
export async function getGasFee(chainKey: string, apiKey: string | null = null): Promise<FeeResult> {
  const allChains = Object.values(evmNetworks) as ChainConfig[];
  const chain = allChains.find(c => 
    c.name.toLowerCase() === chainKey.toLowerCase() || 
    c.symbol.toLowerCase() === chainKey.toLowerCase() ||
    c.type?.toLowerCase() === chainKey.toLowerCase()
  );

  if (!chain) {
    console.warn(`[FEE_SERVICE] Chain key "${chainKey}" not found in registry. Using default.`);
    return {
      nativeFee: '0.001',
      usdFee: 0.05,
      estimatedFeeUSD: 0.05,
      estimatedTime: 'Unknown'
    };
  }

  const result = await fetchChainFees(
    chain.type || 'evm',
    chain.rpcUrl,
    chain.symbol,
    apiKey
  );

  return {
    ...result,
    estimatedFeeNative: result.nativeFee,
    estimatedFeeUSD: result.usdFee > 0 ? result.usdFee : 0.05
  };
}

export async function fetchChainFees(
  chainType: string,
  rpcUrl: string,
  symbol: string,
  apiKey: string | null
): Promise<FeeResult> {
  try {
    switch (chainType) {
      case 'btc':
      case 'ltc':
      case 'doge':
      case 'bitcoin-cash':
        return await fetchUtxoFees(chainType, rpcUrl);
      case 'solana':
        return await fetchSolanaFees(rpcUrl);
      case 'xrp':
        return await fetchXrpFees(rpcUrl);
      case 'near':
        return await fetchNearFees(rpcUrl);
      case 'tron':
        return await fetchTronFees(rpcUrl);
      case 'polkadot':
      case 'kusama':
        return await fetchSubstrateFees(rpcUrl, chainType);
      case 'cosmos':
      case 'osmosis':
      case 'secret':
      case 'injective':
      case 'celestia':
        return await fetchCosmosFees(rpcUrl, symbol);
      case 'aptos':
        return await fetchAptosFees(rpcUrl);
      case 'sui':
        return await fetchSuiFees(rpcUrl);
      case 'algorand':
        return await fetchAlgorandFees(rpcUrl);
      case 'cardano':
        return await fetchCardanoFees();
      case 'hedera':
        return await fetchHederaFees();
      case 'tezos':
        return await fetchTezosFees(rpcUrl);
      case 'evm':
      default:
        return await fetchEvmFees(rpcUrl, apiKey);
    }
  } catch (error) {
    console.warn(`[FEE_SERVICE_ADVISORY] Failed to fetch fees for ${chainType}:`, error);
    return {
      nativeFee: '0.001',
      usdFee: 0.05,
      estimatedFeeUSD: 0.05,
      estimatedTime: 'Unknown'
    };
  }
}

async function fetchUtxoFees(type: string, rpcUrl: string): Promise<FeeResult> {
  let endpoint = null;
  if (type === 'btc') endpoint = 'https://mempool.space/api/v1/fees/recommended';
  if (type === 'bitcoin-cash') endpoint = 'https://api.blockchair.com/bitcoin-cash/stats';

  if (endpoint) {
    try {
      const { data } = await axios.get(endpoint);
      const satPerVByte = type === 'bitcoin-cash' ? (data.data.suggested_transaction_fee_per_byte_sat || 1) : (data.hourFee || 1); 
      const avgTxSize = 140; 
      const totalSats = satPerVByte * avgTxSize;
      return {
        nativeFee: (totalSats / 100_000_000).toFixed(8),
        usdFee: type === 'bitcoin-cash' ? 0.01 : 0.50, 
        estimatedFeeUSD: type === 'bitcoin-cash' ? 0.01 : 0.50,
        estimatedTime: type === 'bitcoin-cash' ? '~10m' : '~60m',
        satPerVByte
      };
    } catch (e) {}
  }

  return {
    nativeFee: '0.0001',
    usdFee: 0.01,
    estimatedFeeUSD: 0.01,
    estimatedTime: '~10m'
  };
}

/**
 * 🔥 FIXED: fetchEvmFees with robust fallback for rate-limited gas stations
 * 
 * Problem: Ethers.js v6 on Polygon tries to hit the public Gas Station API
 * which is rate-limited (429 errors). This function now:
 * 
 * 1. Tries provider.getFeeData() with a short timeout
 * 2. Falls back to hardcoded reasonable gas prices if rate-limited
 * 3. Never crashes the app due to gas price issues
 */
async function fetchEvmFees(rpcUrl: string, apiKey: string | null): Promise<FeeResult> {
  const finalRpc = rpcUrl.replace('{API_KEY}', apiKey || '');
  const provider = new ethers.JsonRpcProvider(finalRpc, undefined, { staticNetwork: true });
  
  try {
    // Attempt to fetch real fee data with a 5-second timeout
    const feeDataPromise = provider.getFeeData();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gas price fetch timeout')), 5000)
    );

    const feeData = await Promise.race([feeDataPromise, timeoutPromise]) as any;
    
    if (feeData && feeData.gasPrice) {
      const gasPrice = feeData.gasPrice;
      const standardLimit = BigInt(21000);
      const totalWei = gasPrice * standardLimit;

      return {
        gasPriceGwei: ethers.formatUnits(gasPrice, 'gwei'),
        nativeFee: ethers.formatUnits(totalWei, 'ether'),
        usdFee: 0.05,
        estimatedFeeUSD: 0.05,
        estimatedTime: '~15s'
      };
    }

    throw new Error('No gas price in response');
  } catch (error: any) {
    // Rate limited, timeout, or other fetch error - use safe defaults
    const isRateLimited = error?.code === -32005 || error?.message?.includes('429') || error?.message?.includes('Too Many Requests');
    
    if (isRateLimited) {
      console.warn(
        '[GAS_FEE] Public Gas Station rate-limited (429). Using conservative fallback prices.'
      );
    } else {
      console.warn('[GAS_FEE] Failed to fetch real gas prices. Using conservative fallback:', error?.message);
    }

    // Determine chain and use chain-specific safe defaults
    const rpcHost = finalRpc.split('/').slice(2).join('/').split(':')[0];
    let defaultGasPrice = BigInt(20000000000); // 20 Gwei

    // Chain-specific conservative estimates (won't waste user gas)
    if (rpcHost.includes('polygon')) {
      defaultGasPrice = BigInt(30000000000); // 30 Gwei for Polygon
    } else if (rpcHost.includes('arbitrum')) {
      defaultGasPrice = BigInt(5000000000); // 5 Gwei for Arbitrum
    } else if (rpcHost.includes('optimism')) {
      defaultGasPrice = BigInt(5000000000); // 5 Gwei for Optimism
    } else if (rpcHost.includes('mainnet')) {
      defaultGasPrice = BigInt(30000000000); // 30 Gwei for Ethereum Mainnet
    }

    const standardLimit = BigInt(21000);
    const totalWei = defaultGasPrice * standardLimit;

    return {
      gasPriceGwei: ethers.formatUnits(defaultGasPrice, 'gwei'),
      nativeFee: ethers.formatUnits(totalWei, 'ether'),
      usdFee: 0.05,
      estimatedFeeUSD: 0.05,
      estimatedTime: '~15s'
    };
  }
}

async function fetchSolanaFees(rpcUrl: string): Promise<FeeResult> {
  const connection = new Connection(rpcUrl, 'confirmed');
  const { feeCalculator } = await connection.getRecentBlockhash();
  const lamportsPerSignature = feeCalculator.lamportsPerSignature;
  const nativeFee = (lamportsPerSignature / 1_000_000_000).toFixed(9);

  return {
    nativeFee,
    usdFee: 0.01,
    estimatedFeeUSD: 0.01,
    estimatedTime: '~5s'
  };
}

async function fetchXrpFees(rpcUrl: string): Promise<FeeResult> {
  const client = new xrpl.Client(rpcUrl);
  await client.connect();
  const response = await client.request({ command: 'fee' });
  await client.disconnect();

  const drops = response.result.drops.median_fee;
  const nativeFee = xrpl.dropsToXrp(drops);

  return {
    nativeFee,
    usdFee: 0.01,
    estimatedFeeUSD: 0.01,
    estimatedTime: '~3s'
  };
}

async function fetchNearFees(rpcUrl: string): Promise<FeeResult> {
  try {
    const { connect, keyStores } = await import('near-api-js');
    const near = await connect({
      networkId: "mainnet",
      nodeUrl: rpcUrl,
      keyStore: new keyStores.InMemoryKeyStore(),
      headers: {}
    });
    const gasPrice = await near.connection.provider.gasPrice();
    // NEAR standard transfer cost: ~300 TGas (300 * 10^12 yoctoNEAR)
    const standardTransferGas = 300000000000000;
    const totalYocto = BigInt(gasPrice) * BigInt(standardTransferGas);
    const nativeFee = (Number(totalYocto) / 1e24).toFixed(6);

    return {
      nativeFee,
      usdFee: 0.01,
      estimatedFeeUSD: 0.01,
      estimatedTime: '~2s'
    };
  } catch (e) {
    return { nativeFee: '0.0001', usdFee: 0.01, estimatedFeeUSD: 0.01, estimatedTime: '~2s' };
  }
}

async function fetchTronFees(rpcUrl: string): Promise<FeeResult> {
  // TRON bandwidth/energy is complex, using a standard 1 TRX fee estimate
  return {
    nativeFee: '1.0',
    usdFee: 0.15,
    estimatedFeeUSD: 0.15,
    estimatedTime: '~3s'
  };
}

async function fetchSubstrateFees(rpcUrl: string, type: string): Promise<FeeResult> {
  // Polkadot/Kusama fees are weight-based, using standard transfer estimates
  return {
    nativeFee: type === 'polkadot' ? '0.015' : '0.001',
    usdFee: 0.05,
    estimatedFeeUSD: 0.05,
    estimatedTime: '~6s'
  };
}

async function fetchCosmosFees(rpcUrl: string, symbol: string): Promise<FeeResult> {
  // Cosmos SDK fees are usually specified by the validator, returning standard 0.005 denom
  return {
    nativeFee: '0.005',
    usdFee: 0.05,
    estimatedFeeUSD: 0.05,
    estimatedTime: '~6s'
  };
}

async function fetchAptosFees(rpcUrl: string): Promise<FeeResult> {
  try {
    const { AptosClient } = await import('aptos');
    const client = new AptosClient(rpcUrl);
    const gasPrice = await client.getGasUnitPrice();
    const nativeFee = (Number(gasPrice) * 2000 / 1e8).toString(); 
    return {
      nativeFee,
      usdFee: 0.01,
      estimatedFeeUSD: 0.01,
      estimatedTime: '~1s'
    };
  } catch (e) {
    return { nativeFee: '0.001', usdFee: 0.01, estimatedFeeUSD: 0.01, estimatedTime: '~1s' };
  }
}

async function fetchSuiFees(rpcUrl: string): Promise<FeeResult> {
  try {
    const { SuiClient } = await import('@mysten/sui/client');
    const client = new SuiClient({ url: rpcUrl });
    const gasPrice = await client.getReferenceGasPrice();
    const nativeFee = (Number(gasPrice) * 1000 / 1e9).toString();
    return {
      nativeFee,
      usdFee: 0.01,
      estimatedFeeUSD: 0.01,
      estimatedTime: '~1s'
    };
  } catch (e) {
    return { nativeFee: '0.001', usdFee: 0.01, estimatedFeeUSD: 0.01, estimatedTime: '~1s' };
  }
}

async function fetchAlgorandFees(rpcUrl: string): Promise<FeeResult> {
  try {
    const algosdk = (await import('algosdk')).default;
    const client = new algosdk.Algodv2("", rpcUrl, "");
    const params = await client.getTransactionParams().do();
    const nativeFee = (params.fee / 1e6).toFixed(6);
    return {
      nativeFee,
      usdFee: 0.01,
      estimatedFeeUSD: 0.01,
      estimatedTime: '~4s'
    };
  } catch (e) {
    return { nativeFee: '0.001', usdFee: 0.01, estimatedFeeUSD: 0.01, estimatedTime: '~4s' };
  }
}

async function fetchCardanoFees(): Promise<FeeResult> {
  // Cardano fees are deterministic (a + b * size), standard transfer is ~0.17 ADA
  return {
    nativeFee: '0.17',
    usdFee: 0.10,
    estimatedFeeUSD: 0.10,
    estimatedTime: '~20s'
  };
}

async function fetchHederaFees(): Promise<FeeResult> {
  // Hedera uses fixed USD prices, transfer is $0.0001
  return {
    nativeFee: '0.0001',
    usdFee: 0.0001,
    estimatedFeeUSD: 0.0001,
    estimatedTime: '~3s'
  };
}

async function fetchTezosFees(rpcUrl: string): Promise<FeeResult> {
  try {
    const { TezosToolkit } = await import('@taquito/taquito');
    const tezos = new TezosToolkit(rpcUrl);
    // Standard transfer is roughly 0.001 XTZ
    return {
      nativeFee: '0.001',
      usdFee: 0.01,
      estimatedFeeUSD: 0.01,
      estimatedTime: '~30s'
    };
  } catch (e) {
    return { nativeFee: '0.001', usdFee: 0.01, estimatedFeeUSD: 0.01, estimatedTime: '~30s' };
  }
}
