import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * DASHBOARD HYDRATION ENDPOINT
 * Version: 1.0.0
 * Aggregates real identity data with high-fidelity mock stream.
 */
export async function GET() {
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
    // 1. Resolve real user count
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 2. High-Fidelity Mock Payload
    const data = {
      userCount: userCount || 1240,
      totalRevenue: 4528000,
      newOrdersCount: 128,
      openDisputesCount: 4,
      storage: {
        totalSize: 450000000, // 450 MB
        databaseSize: 120000000, // 120 MB
        databaseTotal: 1073741824 // 1 GB
      },
      latestTransactions: [
        { id: '1', user: 'crypto_knight', product: 'Escrow Lock: 500 WNC', amount: '₦350,000', status: 'Paid', released: false, avatar: 'https://picsum.photos/seed/u1/40/40' },
        { id: '2', user: 'velvet_node', product: 'Asset Payout: ETH', amount: '₦850,000', status: 'Completed', released: true, avatar: 'https://picsum.photos/seed/u2/40/40' },
        { id: '3', user: 'storm_rider', product: 'Identity Fee', amount: '₦15,000', status: 'Processing', released: false, avatar: 'https://picsum.photos/seed/u3/40/40' },
        { id: '4', user: 'nexus_authority', product: 'Escrow Lock: 1200 WNC', amount: '₦940,000', status: 'Paid', released: false, avatar: 'https://picsum.photos/seed/u4/40/40' },
        { id: '5', user: 'alpha_operator', product: 'Premium Upgrade', amount: '₦45,000', status: 'Completed', released: true, avatar: 'https://picsum.photos/seed/u5/40/40' },
      ],
      recentActivity: [
        { user: 'sigma_node', type: 'Credit Deposit', amount: '+₦12,000', color: 'green', avatar: 'https://picsum.photos/seed/a1/40/40' },
        { user: 'omega_registry', type: 'WNC Withdrawal', amount: '-₦45,000', color: 'blue', avatar: 'https://picsum.photos/seed/a2/40/40' },
        { user: 'echo_pulse', type: 'Node Verification', amount: '+₦0', color: 'blue', avatar: 'https://picsum.photos/seed/a3/40/40' },
        { user: 'delta_sentinel', type: 'Reward Auth', amount: '+₦100,000', color: 'green', avatar: 'https://picsum.photos/seed/a4/40/40' },
      ],
      pendingDisputes: [
        { user: 'dispute_alpha', issue: 'Non-Delivery Report #8321', date: '2h ago', avatar: 'https://picsum.photos/seed/d1/40/40' },
        { user: 'dispute_beta', issue: 'Identity Mismatch Alert', date: '5h ago', avatar: 'https://picsum.photos/seed/d2/40/40' },
      ]
    };

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
