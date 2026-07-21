import { NextRequest, NextResponse } from 'next/server';

/**
 * INSTITUTIONAL PARASWAP PROXY
 * Version: 1.0.0
 * Handles price discovery and transaction building via backend handshake.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chainId = searchParams.get('chainId');
  const srcToken = searchParams.get('srcToken');
  const destToken = searchParams.get('destToken');
  const amount = searchParams.get('amount');
  const userAddress = searchParams.get('userAddress');

  if (!chainId || !srcToken || !destToken || !amount || !userAddress) {
    return NextResponse.json({ error: 'Missing registry nodes' }, { status: 400 });
  }

  try {
    // 1. PRICE DISCOVERY
    const priceUrl = `https://apiv5.paraswap.io/prices/?` +
      new URLSearchParams({
        srcToken,
        destToken,
        amount,
        side: 'SELL',
        network: chainId,
        userAddress
      });

    const priceRes = await fetch(priceUrl);
    const priceData = await priceRes.json();

    if (!priceRes.ok || !priceData?.priceRoute) {
      return NextResponse.json({ error: 'No route available' }, { status: 404 });
    }

    // 2. TRANSACTION BUILD HANDSHAKE
    const txRes = await fetch(
      `https://apiv5.paraswap.io/transactions/${chainId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          srcToken,
          destToken,
          srcAmount: amount,
          destAmount: priceData.priceRoute.destAmount,
          userAddress,
          priceRoute: priceData.priceRoute,
          slippage: 50 // 0.5% institutional standard
        })
      }
    );

    const txData = await txRes.json();

    if (!txRes.ok) {
      return NextResponse.json({ error: 'ParaSwap building failed' }, { status: 500 });
    }

    return NextResponse.json({
      priceRoute: priceData.priceRoute,
      tx: txData
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
