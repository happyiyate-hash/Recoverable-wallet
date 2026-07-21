'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useUser } from '@/contexts/user-provider';
import { supabase } from '@/lib/supabase/client';
import BuyerEscrow from '@/components/escrow/BuyerEscrow';
import SellerEscrow from '@/components/escrow/SellerEscrow';

/**
 * INSTITUTIONAL ESCROW ROLE RESOLVER
 * Version: 9.0.0 (Prop Sync Patch)
 * 
 * This file resolves whether the current user is the Buyer or Seller 
 * and renders the appropriate terminal with the required tradeId node.
 */
export default function TradeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();

  const [trade, setTrade] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id || !user || !supabase) return;

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('escrow_trades')
          .select('id, buyer_id, seller_id')
          .eq('id', params.id)
          .single();

        if (error) throw error;
        setTrade(data);
      } catch (e) {
        console.error("[ROLE_RESOLUTION_FAIL]", e);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [params?.id, user]);

  if (loading) return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#050505] gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Identifying Role Node...</p>
    </div>
  );

  if (!trade || !user) return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#050505] p-10 text-center gap-6">
      <ShieldAlert className="w-16 h-16 text-red-500" />
      <div className="space-y-2">
        <h2 className="text-xl font-black uppercase text-white">Node Link Failure</h2>
        <p className="text-xs text-muted-foreground">The requested trade node could not be resolved or you are not authorized.</p>
      </div>
      <button onClick={() => router.push('/escrow')} className="h-12 px-8 rounded-xl bg-white/5 border border-white/5 text-white uppercase text-[10px] font-black tracking-widest">Return to Dashboard</button>
    </div>
  );

  const isBuyer = trade.buyer_id === user.id;
  const isSeller = trade.seller_id === user.id;

  if (!isBuyer && !isSeller) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#050505] p-10 text-center gap-6">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h2 className="text-xl font-black uppercase text-white">Access Denied</h2>
        <p className="text-xs text-muted-foreground">This identity node does not have authority to view this trade registry.</p>
        <button onClick={() => router.push('/escrow')} className="h-12 px-8 rounded-xl bg-white/5 border border-white/5 text-white uppercase text-[10px] font-black tracking-widest">Back</button>
      </div>
    );
  }

  // RENDER CORRESPONDING TERMINAL
  return isBuyer ? (
    <BuyerEscrow 
      tradeId={params.id as string} 
      currentUserId={user.id} 
    />
  ) : (
    <SellerEscrow 
      tradeId={params.id as string} 
      currentUserId={user.id} 
    />
  );
}
