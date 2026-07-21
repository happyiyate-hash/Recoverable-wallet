
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * INSTITUTIONAL BUY WEBHOOK ENDPOINT
 * Version: 1.0.0
 * Processes callbacks from Ramp, Paychant, and Alchemy Pay.
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
    const body = await req.json();
    const { orderId, status, txHash } = body;

    // 1. Validate body
    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 2. Update the internal registry
    const { data: order, error: updateError } = await supabase
      .from('buy_orders')
      .update({ 
        status: status === 'success' ? 'success' : 'failed',
        tx_hash: txHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 3. Dispatch Notification
    if (status === 'success') {
      await supabase.from('notifications').insert({
        user_id: order.user_id,
        type: 'REWARD',
        title: 'Crypto Delivered',
        message: `Your purchase of ${order.fiat_amount} ${order.fiat_currency} worth of ${order.token_symbol} has been confirmed.`,
        transaction_id: txHash
      });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("[BUY_WEBHOOK_ERROR]", error.message);
    return NextResponse.json({ error: 'Internal Webhook Failure' }, { status: 500 });
  }
}
