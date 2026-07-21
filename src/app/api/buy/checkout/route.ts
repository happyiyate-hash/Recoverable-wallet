
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * BUY CRYPTO CHECKOUT ENGINE
 * Version: 1.0.0
 * Generates signed checkout URLs or redirect links for the selected provider.
 */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  );

  try {
    const { providerId, amount, currency, asset, walletAddress } = await req.json();

    if (!providerId || !amount || !walletAddress) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Fetch provider details
    const { data: provider, error: providerError } = await supabase
      .from('buy_providers')
      .select('*')
      .eq('identifier', providerId)
      .single();

    if (providerError || !provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // 2. Generate Checkout URL based on Provider
    let checkoutUrl = '';

    switch (providerId) {
      case 'RAMP':
        const rampParams = new URLSearchParams({
          userAddress: walletAddress,
          swapAsset: asset,
          fiatValue: amount.toString(),
          fiatCurrency: currency,
          hostAppName: 'WNC Wallet',
          hostLogoUrl: 'https://gcghriodmljkusdduhzl.supabase.co/storage/v1/object/public/logos/node-quick-icon.png'
        });
        checkoutUrl = `https://buy.ramp.network/?${rampParams.toString()}`;
        break;

      case 'PAYCHANT':
        // Paychant uses specific query params for African regions
        const paychantParams = new URLSearchParams({
          address: walletAddress,
          fiat_amount: amount.toString(),
          fiat_currency: currency,
          asset: asset,
          network: 'Mainnet' // Standardize network names
        });
        checkoutUrl = `https://paychant.com/buy?${paychantParams.toString()}`;
        break;

      case 'MOONPAY':
        // Example MoonPay implementation (requires signing in production)
        const moonpayUrl = `https://buy.moonpay.com?apiKey=${process.env.MOONPAY_API_KEY}&currencyCode=${asset.toLowerCase()}&walletAddress=${walletAddress}&baseCurrencyAmount=${amount}&baseCurrencyCode=${currency.toLowerCase()}`;
        checkoutUrl = moonpayUrl;
        break;

      default:
        return NextResponse.json({ error: 'Unimplemented provider session logic' }, { status: 400 });
    }

    return NextResponse.json({ checkoutUrl });

  } catch (error: any) {
    console.error("[BUY_CHECKOUT_ERROR]", error.message);
    return NextResponse.json({ error: 'Failed to initialize session' }, { status: 500 });
  }
}
