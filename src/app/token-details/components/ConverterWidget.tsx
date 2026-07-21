import React, { useState } from 'react';

export default function ConverterWidget({ price, symbol }: { price: number, symbol: string }) {
  const [amount, setAmount] = useState<string>("1");
  
  // Guard against invalid NaN inputs
  const parsedAmount = parseFloat(amount);
  const safeAmount = isNaN(parsedAmount) ? 0 : parsedAmount;

  return (
    <div className="bg-[#111111] p-4 rounded-2xl border border-[#1F1F1F] space-y-3 transition-all duration-300 hover:border-[#2a2a2a]">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-white/90">{symbol} Converter</h3>
      </div>
      
      <div className="relative">
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full bg-[#0A0A0A] p-3 rounded-xl outline-none text-white/90 font-semibold focus:ring-1 focus:ring-orange-500/50 transition-all duration-300 border border-transparent focus:border-orange-500/30"
          placeholder="0.00"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 font-bold text-xs">
          {symbol}
        </div>
      </div>

      <div className="text-white/60 text-sm font-medium px-1">
        ≈ ${(safeAmount * price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USD
      </div>
    </div>
  );
}
