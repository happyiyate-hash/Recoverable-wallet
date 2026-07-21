import React from 'react';
import { ArrowLeft, Star, MoreHorizontal } from 'lucide-react';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';

export default function TokenDetailHeader({ 
  onBack, 
  token, 
  network 
}: { 
  onBack: () => void
  token: any
  network: any 
}) {
  return (
    <div className="flex items-center justify-between p-4 sticky top-0 z-[150] bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-[#1A1A1A]">
      <button 
        onClick={onBack} 
        className="p-2 rounded-xl hover:bg-[#111111] text-white transition-all duration-300 active:scale-95"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
          <TokenLogoDynamic 
            logoUrl={token?.iconUrl} 
            alt={token?.name} 
            size={24} 
            chainId={token?.chainId} 
            name={token?.name}
            symbol={token?.symbol}
          />
          <span className="font-bold text-lg uppercase tracking-tight text-white/90 flex items-center gap-1">
            {token?.symbol}
            <div className="w-3 h-3 bg-orange-500 rounded-sm flex items-center justify-center ml-1 shadow-[0_0_10px_rgba(255,140,0,0.5)]">
              <span className="text-[8px] text-black font-black">✓</span>
            </div>
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-white/60 font-medium">{token?.name || network?.name}</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#111111] text-white/60 font-bold uppercase tracking-widest border border-[#1F1F1F]">
            {network?.name?.substring(0, 3) || 'BSC'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <button className="p-2 rounded-xl hover:bg-[#111111] text-white/60 hover:text-orange-500 transition-all duration-300">
          <Star className="w-5 h-5" />
        </button>
        <button className="p-2 rounded-xl hover:bg-[#111111] text-white/60 transition-all duration-300">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
