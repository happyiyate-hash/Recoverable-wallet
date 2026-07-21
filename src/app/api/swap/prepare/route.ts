import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { fetchThorQuote } from '@/lib/thorchain/fetchQuote';
import { applyPlatformFee } from '@/lib/calc/applyFee';

/**
 * INSTITUTIONAL SWAP PREPARATION API
 * Version: 2.0.0 (THORChain Split-Payout Handshake)
 */

export async function POST(req: NextRequest) {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { fromChain, toChain, fromSymbol, toSymbol, amount, provider, userDestination } = body;

    // 1. THORCHAIN NATIVE HANDSHAKE
    if (provider === 'THORCHAIN') {
      const adminWallet = process.env.ADMIN_WALLET || '0x7f3f4206017C0aACF7A94C9eF7B80563984aD288';
      
      // Request quote from ThorNode with Admin as destination for split-payout
      const quote = await fetchThorQuote(
        fromChain,
        toChain,
        fromSymbol,
        toSymbol,
        amount,
        adminWallet
      );

      const expectedRaw = parseFloat(quote.toAmount);
      const { fee, userAmount } = applyPlatformFee(expectedRaw);

      // Create ledger record
      const { data: swap, error } = await supabase.from('swaps').insert({
        user_id: user.id,
        from_chain: fromChain,
        to_chain: toChain,
        from_symbol: fromSymbol,
        to_symbol: toSymbol,
        from_amount: parseFloat(amount),
        to_amount_expected: userAmount,
        platform_fee_expected: fee,
        status: 'awaiting_deposit',
        provider: 'THORCHAIN',
        inbound_address: quote.inboundAddress,
        memo: quote.memo,
        recipient_address: userDestination
      }).select().single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        swapId: swap.id,
        inboundAddress: quote.inboundAddress,
        memo: quote.memo,
        receiveAmount: userAmount,
        expiry: quote.expiry
      });
    }

    // Fallback for other providers handled client-side or in other routes
    return NextResponse.json({ error: 'Unsupported preparation path' }, { status: 400 });

  } catch (error: any) {
    console.error('[API_SWAP_PREPARE_ERROR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
