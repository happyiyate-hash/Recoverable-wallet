import React from 'react';

const ranges = ["1H", "24H", "7D", "30D", "3M", "1Y", "ALL"];

export default function TimeFilterTabs({ value, onChange }: { value: string, onChange: (r: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto thin-scrollbar pb-1">
      {ranges.map(r => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${
            value === r
              ? "bg-orange-500 text-black shadow-[0_0_15px_rgba(255,140,0,0.3)]"
              : "bg-[#111111] text-white/60 hover:text-white/90 hover:bg-[#1a1a1a] border border-[#1F1F1F]"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
