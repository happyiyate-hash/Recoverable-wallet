import React from 'react';

export default function PriceDisplay({ price, change, symbol }: { price: number, change: number, symbol: string }) {
  const isUp = change >= 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <h1 className="text-4xl font-bold text-white/90 tracking-tight">
          ${price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
        </h1>
        <div className={`px-2 py-1 rounded-md text-sm font-bold flex items-center gap-1 ${isUp ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          <span>{isUp ? "▲" : "▼"}</span>
          <span>{Math.abs(change)?.toFixed(2)}%</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm font-medium text-white/60">
        <span>≈ 1.00 {symbol}</span>
        <span className="text-white/40">(24H)</span>
      </div>
    </div>
  );
}
