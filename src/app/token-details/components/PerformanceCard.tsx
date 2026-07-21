import React from 'react';

const items = ["1H", "24H", "7D", "30D", "1Y"];

export default function PerformanceCard({ performanceMetrics }: { performanceMetrics: any[] }) {
  return (
    <div className="bg-[#111111] p-4 rounded-2xl border border-[#1F1F1F] transition-all duration-300 hover:border-[#2a2a2a]">
      <div className="flex justify-between">
        {items.map(range => {
          const metric = performanceMetrics?.find(m => m.range === range);
          const val = Number(metric?.value || 0);
          const isNeg = val < 0;
          
          return (
            <div key={range} className="text-center">
              <p className="text-[11px] font-medium text-white/50 mb-1">{range}</p>
              <p className={`text-xs font-bold ${val === 0 ? "text-white/40" : isNeg ? "text-red-500" : "text-green-500"}`}>
                {val === 0 ? "0%" : `${Math.abs(val).toFixed(1)}%`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
