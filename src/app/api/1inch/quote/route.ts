import { NextRequest, NextResponse } from 'next/server';

/**
 * INSTITUTIONAL 1INCH QUOTE PROXY
 * Version: 1.0.0
 * Safely fetches price data without exposing API keys to the client.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chainId = searchParams.get('chainId');

  if (!chainId) {
    return NextResponse.json({ error: "Missing chainId node" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.1inch.dev/swap/v5.2/${chainId}/quote?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ONEINCH_API_KEY || 'AIzaSy-placeholder'}`,
          Accept: 'application/json'
        }
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
