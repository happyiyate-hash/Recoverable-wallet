
import { NextRequest, NextResponse } from 'next/server';
import { fetchChainFees } from '@/lib/wallets/services/fee-service';

/**
 * INSTITUTIONAL FEE GATEWAY
 * Features 30-second TTL caching to protect RPC quotas.
 */

const feeCache: { [key: string]: { data: any; timestamp: number } } = {};
const CACHE_TTL = 30000; // 30 Seconds

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chainType = searchParams.get('chainType') || 'evm';
  const rpcUrl = searchParams.get('rpcUrl');
  const symbol = searchParams.get('symbol');
  const apiKey = searchParams.get('apiKey');

  if (!rpcUrl) {
    return NextResponse.json({ error: 'Missing RPC URL' }, { status: 400 });
  }

  const cacheKey = `${chainType}:${rpcUrl}:${symbol}`;
  const now = Date.now();

  if (feeCache[cacheKey] && now - feeCache[cacheKey].timestamp < CACHE_TTL) {
    return NextResponse.json(feeCache[cacheKey].data);
  }

  try {
    const result = await fetchChainFees(chainType, rpcUrl, symbol || '', apiKey);
    
    feeCache[cacheKey] = {
      data: result,
      timestamp: now
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
