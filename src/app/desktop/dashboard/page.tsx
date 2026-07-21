'use client';

import React from 'react';
import DesktopWalletTab from '@/components/wallet/desktop-wallet-tab';
import { useWallet } from '@/contexts/wallet-provider';

/**
 * INSTITUTIONAL WALLET CENTER V7
 * Persistent dashboard node for the SPA layout.
 */
export default function DesktopDashboard() {
  const { allAssets } = useWallet();

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Terminal Board</h1>
        <p className="text-[11px] font-black text-primary uppercase tracking-[0.4em]">Handshake Protocol v7.2 Active</p>
      </header>

      <DesktopWalletTab computedAssets={allAssets} />
    </div>
  );
}
