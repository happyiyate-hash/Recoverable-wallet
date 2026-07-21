
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * BUY CRYPTO QUOTE ENGINE
 * Version: 1.0.0
 * Aggregates quotes from MoonPay, Ramp, and Paychant based on user region.
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
    const { amount, currency, asset, country } = await req.json();

    if (!amount || !currency || !asset) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Fetch available providers for this region/asset
    const { data: configs, error: configError } = await supabase
      .from('buy_provider_config')
      .select('*, buy_providers(*)')
      .eq('country_code', country)
      .eq('asset_symbol', asset)
      .eq('is_enabled', true);

    if (configError) throw configError;

    // 2. Aggregate Quotes (Mock implementation for now)
    // In production, this would call MoonPay/Ramp/Paychant APIs in parallel.
    const quotes = configs?.map(config => {
      const provider = config.buy_providers;
      const baseFee = Number(provider.base_fee_percent) || 0;
      const platformFee = amount * 0.01; // Example 1% platform fee
      const totalFee = (amount * (baseFee / 100)) + platformFee;
      
      // Mock exchange rate (should be fetched from provider)
      const mockRate = asset === 'USDT' ? 1 : 0.000045; 
      const cryptoAmount = (amount - totalFee) * mockRate;

      return {
        providerId: provider.identifier,
        providerName: provider.name,
        fiatAmount: amount,
        fiatCurrency: currency,
        cryptoAmount: cryptoAmount,
        feeTotal: totalFee,
        platformFee: platformFee,
        logoUrl: provider.logo_url
      };
    }) || [];

    // Sort by best yield (highest cryptoAmount)
    quotes.sort((a, b) => b.cryptoAmount - a.cryptoAmount);

    return NextResponse.json({ quotes });

  } catch (error: any) {
    console.error("[BUY_QUOTE_ERROR]", error.message);
    return NextResponse.json({ error: 'Failed to aggregate quotes' }, { status: 500 });
  }
}
