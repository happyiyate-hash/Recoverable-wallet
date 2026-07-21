
'use client';

import React from 'react';
import { History, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminTransactionsPage() {
  return (
    <div className="flex flex-col h-full p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white">Global Ledger</h1>
          <p className="text-xs font-black uppercase text-primary tracking-widest mt-1">Transaction Node History</p>
        </div>
        <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 gap-2"><Download className="w-4 h-4" /> Export Node</Button>
      </header>

      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden flex-1">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-[8px] uppercase tracking-widest text-white/20 font-black">
            <tr><th className="px-6 py-4">Node Hash</th><th className="px-6 py-4">Asset</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Timestamp</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <tr className="hover:bg-white/[0.01] transition-colors"><td colSpan={5} className="px-6 py-20 text-center text-[10px] font-black uppercase tracking-widest text-white/10">Scanning Ledger...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
