'use client';

import React from 'react';
import SwapClient from '@/components/swap/DesktopSwap';

export function MobileSwapPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col justify-between p-2 sm:p-3 pb-12">
      {/* Compact top area */}
      <div className="w-full max-w-md mx-auto flex flex-col gap-y-2 mt-1">
        <header className="flex items-center justify-between px-0.5 py-1 border-b border-neutral-900">
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold tracking-tight text-neutral-100">Asset Exchange</h1>
            <p className="text-[10px] text-neutral-500">Secure Institutional Multi-Chain Router</p>
          </div>
          <div className="flex items-center gap-x-1 bg-neutral-900/60 px-1 py-0.5 rounded-lg border border-neutral-800/40">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-medium tracking-wide text-neutral-400 uppercase">0x Aggregator</span>
          </div>
        </header>
        <section className="bg-neutral-900/30 rounded-2xl p-2 border border-neutral-950 shadow-2xl backdrop-blur-md">
          <SwapClient />
        </section>
      </div>
      <footer className="w-full max-w-md mx-auto px-1 py-1 flex items-center justify-between text-[9px] text-neutral-600 border-t border-neutral-900/60 mt-2">
        <span>Slippage Protection: Auto (0.5%)</span>
        <span>Network Infrastructure Status: Nominal</span>
      </footer>
    </main>
  );
}

export default function SwapPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#050505]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <SwapClient />
    </Suspense>
  );
}
