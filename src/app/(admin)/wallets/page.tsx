
'use client';

import React from 'react';
import { Wallet, Search, TrendingUp, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AdminWalletsPage() {
  return (
    <div className="flex flex-col h-full p-8 space-y-8 overflow-y-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white">Vault Registry</h1>
          <p className="text-xs font-black uppercase text-primary tracking-widest mt-1">Institutional Liquidity Nodes</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <Input placeholder="Search Vault..." className="bg-white/5 border-white/10 rounded-xl pl-10 h-11 text-xs" />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 rounded-[3rem] bg-white/[0.02] border border-white/5 relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Zap className="w-24 h-24 text-primary" /></div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20"><Wallet className="w-6 h-6" /></div>
              <div>
                <h3 className="text-lg font-black uppercase text-white">Master Admin Node</h3>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Global Payout Authority</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total Reserves (USD)</p>
              <p className="text-4xl font-black text-white tabular-nums">$1,254,000</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
