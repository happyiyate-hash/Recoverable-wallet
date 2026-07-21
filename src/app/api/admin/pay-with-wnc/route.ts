
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendCryptoWithWNC } from '@/lib/admin/services/pay-with-wnc/service';

/**
 * INSTITUTIONAL SPONSORED DISPATCH API (PAY WITH WNC)
 * Version: 2.0.0 (Standardized JSON Response Node)
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
    // 1. Verify Session Node (Authority Check)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        errorCode: 'UNAUTHORIZED_SESSION', 
        message: 'No active session found for this identity.' 
      }, { status: 401 });
    }

    // 2. Extract Standardized Payload
    const body = await req.json();
    const { 
        destinationAddress, 
        token, 
        tokenAddress, 
        amount, 
        chainId, 
        chainType, 
        wncAmountToDeduct 
    } = body;

    // 3. Invoke Master Cashier Service
    const result = await sendCryptoWithWNC({
        userId: user.id,
        destinationAddress,
        token,
        tokenAddress,
        amount,
        chainId,
        chainType,
        wncAmountToDeduct
    });

    if (!result.success) {
        // Return defined error codes for frontend logic
        const statusMap: Record<string, number> = {
            'LIQUIDITY_MISMATCH': 400,
            'PAYMENT_FAILED': 402, // Payment Required (Internal Ledger)
            'UNSUPPORTED_TOKEN_NODE': 400
        };

        return NextResponse.json({ 
            success: false,
            errorCode: result.error || 'EXECUTION_FAILED', 
            message: result.message 
        }, { status: statusMap[result.error!] || 400 });
    }

    return NextResponse.json({
        success: true,
        txHash: result.txHash,
        message: 'Transaction completed successfully'
    });

  } catch (error: any) {
    console.error('[API_PAY_WNC_ERROR]', error.message);
    return NextResponse.json({ 
        success: false, 
        errorCode: 'INTERNAL_REGISTRY_FAILURE', 
        message: error.message 
    }, { status: 500 });
  }
}
