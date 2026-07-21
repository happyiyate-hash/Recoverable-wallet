
import { NextRequest, NextResponse } from 'next/server';

/**
 * INSTITUTIONAL 0X PROTOCOL PROXY
 * Version: 6.0.0 (Clean Handshake Standard)
 * 
 * Safely handles same-chain price and quote requests.
 * REMOVED: Affiliate fee parameters to prevent 400 errors.
 * Fees are handled in the terminal's UI/Service layer instead.
 */

const ZEROX_API_KEY = '5eebaf6f-e024-41d2-a18f-e05c241129c3';

const BASE_URLS: { [key: string]: string } = {
  '1': 'https://api.0x.org',
  '137': 'https://polygon.api.0x.org',
  '56': 'https://bsc.api.0x.org',
  '43114': 'https://avalanche.api.0x.org',
  '42161': 'https://arbitrum.api.0x.org',
  '10': 'https://optimism.api.0x.org',
  '8453': 'https://base.api.0x.org',
  '59144': 'https://linea.api.0x.org',
  '534352': 'https://scroll.api.0x.org',
  '5000': 'https://mantle.api.0x.org',
  '1329': 'https://sei.api.0x.org'
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chainId = searchParams.get('chainId') || '1';
  const mode = searchParams.get('mode') || 'price'; // 'price' or 'quote'
  
  const baseUrl = BASE_URLS[chainId];
  if (!baseUrl) {
    return NextResponse.json({ 
      error: `Chain ${chainId} not supported by 0x Protocol Registry` 
    }, { status: 400 });
  }

  // Construct hardened parameter list (Clean - No Affiliate Fees)
  const params = new URLSearchParams();
  searchParams.forEach((value, key) => {
    // Only pass core swap parameters
    if (['sellToken', 'buyToken', 'sellAmount', 'takerAddress', 'slippagePercentage'].includes(key)) {
      params.append(key, value);
    }
  });

  try {
    const targetUrl = `${baseUrl}/swap/v1/${mode}?${params.toString()}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        '0x-api-key': ZEROX_API_KEY,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      console.warn('[0X_HANDSHAKE_FAIL]', chainId, mode, data);
      
      let errorMessage = '0x Protocol Handshake Failed';
      if (data.reason) errorMessage = `0x Node: ${data.reason}`;
      if (data.validationErrors && data.validationErrors.length > 0) {
        errorMessage = `Validation: ${data.validationErrors[0].reason}`;
      }

      return NextResponse.json({ 
        error: errorMessage,
        details: data.validationErrors || data.reason
      }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: '0x Registry Timeout' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Institutional Proxy Node Offline' }, { status: 500 });
  }
}
