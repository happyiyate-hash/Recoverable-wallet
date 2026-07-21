import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateSwapRequest } from '@/lib/swap-engine/validator';
import { prepareSwap } from '@/lib/swap-engine/service';
import { getFeeRecipient } from '@/lib/wallets/services/fee-recipients';
import { swapExecutionService } from '@/lib/services/swap-execution-service';

/**
 * INSTITUTIONAL SWAP INITIATION API
 * Version: 1.1.0 (Admin Liquidity Audit Gate)
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
    if (!user) return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });

    const body = await req.json();
    const { 
      fromChainId, 
      toChainId, 
      fromName, 
      toName, 
      fromSymbol,
      toSymbol,
      amount, 
      fromTokenPrice,
      toTokenPrice 
    } = body;

    const request = {
      userId: user.id,
      sourceChain: fromName,
      destinationChain: toName,
      sourceAmount: amount
    };

    // 1. VALIDATION NODE
    const validationError = validateSwapRequest(request, fromChainId, toChainId);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    // 2. PREPARATION NODE (Fees + Hash)
    const swapData = await prepareSwap(request, fromTokenPrice, toTokenPrice);

    // 3. ADMIN LIQUIDITY AUDIT (GATE)
    // We check if the admin vault has the destination funds before allowing the user to send.
    // This prevents stuck trades.
    const hasLiquidity = await swapExecutionService.checkAdminLiquidity(
      { name: toName, chainId: toChainId } as any,
      { symbol: toSymbol, address: body.toTokenAddress, isNative: body.toTokenIsNative } as any,
      swapData.destinationAmount,
      process.env.ADMIN_INFURA_KEY || null
    );

    if (!hasLiquidity) {
      return NextResponse.json({ 
        error: `Insufficient liquidity in the ${toName} admin node. Try a smaller amount.` 
      }, { status: 400 });
    }

    // 4. PERSIST INTENT TO LEDGER
    const { data: swap, error: dbError } = await supabase
      .from('swaps')
      .insert({
        user_id: user.id,
        from_chain: fromName,
        to_chain: toName,
        from_symbol: fromSymbol,
        to_symbol: toSymbol,
        from_amount: amount,
        to_amount_expected: swapData.destinationAmount,
        status: 'pending',
        swap_hash: swapData.swapHash
      })
      .select('id')
      .single();

    if (dbError) throw dbError;

    // 5. RESOLVE ADMIN DEPOSIT TARGET
    const adminAddress = getFeeRecipient(fromName);

    return NextResponse.json({ 
      success: true, 
      swapId: swap.id,
      swapHash: swapData.swapHash,
      adminAddress,
      destinationAmount: swapData.destinationAmount,
      fees: swapData.fees
    });

  } catch (error: any) {
    console.error('[API_SWAP_EXECUTE_ERROR]', error.message);
    return NextResponse.json({ error: error.message || 'Internal swap failure' }, { status: 500 });
  }
}
