import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { adminExecutor } from '@/lib/services/admin-executor';

/**
 * SECURE AGENT EXECUTION API
 * Version: 1.0.0
 * 
 * Rules:
 * 1. SESSION GATED: Only authorized sessions can trigger dispatches.
 * 2. ADMIN FULFILLED: AI only proposes, backend executes via secure cashier.
 */

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  );

  try {
    // 1. IDENTITY HANDSHAKE
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized session." }, { status: 401 });
    }

    const { type, params } = await req.json();

    // 2. DISPATCH ROUTING
    if (type === 'SEND') {
      const { recipient, amount, token } = params;

      // ATOMIC ADMIN FULFILLMENT (Sponsored Node)
      const txHash = await adminExecutor.executeAdminTransfer({
        toAddress: recipient,
        amount: parseFloat(amount),
        tokenSymbol: token,
        chainId: 1, 
        chainType: 'evm'
      });

      return NextResponse.json({
        success: true,
        txHash,
        message: "Institutional dispatch complete."
      });
    }

    return NextResponse.json({ success: false, message: "Unsupported action node." }, { status: 400 });

  } catch (error: any) {
    console.error("[AGENT_EXEC_FAIL]", error.message);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Institutional handshake aborted." 
    }, { status: 500 });
  }
}
