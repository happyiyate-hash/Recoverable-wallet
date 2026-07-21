import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { executeSwap } from '@/lib/swap-engine/worker';

/**
 * INSTITUTIONAL SWAP FINALIZER API
 * Version: 1.0.0 (7-File Engine Integration)
 * 
 * Triggers the admin payout leg once user deposit is confirmed.
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

    const { swapId, txHash } = await req.json();

    if (!swapId || !txHash) {
      return NextResponse.json({ error: 'Missing settlement parameters' }, { status: 400 });
    }

    // 1. FETCH INTENT METADATA
    const { data: swap } = await supabase.from('swaps').select('*').eq('id', swapId).single();
    if (!swap) throw new Error("SWAP_NODE_NOT_FOUND");

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', swap.user_id).single();
    if (!profile) throw new Error("IDENTITY_MISSING");

    // 2. RESOLVE RECIPIENT NODE
    const name = swap.to_chain.toLowerCase();
    let targetAddress = profile.evm_address;
    if (name.includes('solana')) targetAddress = profile.solana_address;
    else if (name.includes('xrp')) targetAddress = profile.xrp_address;
    else if (name.includes('tron')) targetAddress = profile.tron_address;

    if (!targetAddress) throw new Error(`RECIPIENT_${name.toUpperCase()}_NODE_MISSING`);

    // 3. EXECUTE ADMIN PAYOUT (WORKER LEG)
    const adminTxHash = await executeSwap({
      from: process.env.ADMIN_VAULT_ADDRESS || '0x7f3f4206017C0aACF7A94C9eF7B80563984aD288',
      to: targetAddress,
      amount: swap.to_amount_expected,
      chain: swap.to_chain,
      tokenSymbol: swap.to_symbol
    });

    // 4. SETTLE LEDGER
    await supabase.from('swaps').update({ 
      user_tx_hash: txHash,
      admin_tx_hash: adminTxHash, 
      status: 'completed' 
    }).eq('id', swapId);

    return NextResponse.json({ 
      success: true, 
      adminTxHash,
      message: 'Settlement authorized. Payout dispatched.'
    });

  } catch (error: any) {
    console.error('[API_SWAP_FINALIZE_ERROR]', error.message);
    return NextResponse.json({ error: error.message || 'Settlement failure' }, { status: 500 });
  }
}
