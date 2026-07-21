import React from 'react';

export default function PriceStatsCard({ token, marketStats }: any) {
  const marketCap = marketStats?.market_data?.market_cap?.usd;
  const volume = marketStats?.market_data?.total_volume?.usd;
  const supply = marketStats?.market_data?.circulating_supply;
  const rank = marketStats?.market_cap_rank;

  const formatNum = (num: number) => {
    if (!num) return "N/A";
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    return num.toLocaleString();
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat label="Market Cap" value={marketCap ? `$${formatNum(marketCap)}` : "N/A"} />
      <Stat label="Volume (24H)" value={volume ? `$${formatNum(volume)}` : "N/A"} />
      <Stat label="Supply" value={supply ? formatNum(supply) : "N/A"} />
      <Stat label="Rank" value={rank ? `#${rank}` : "N/A"} />
    </div>
  );
}

function Stat({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-[#111111] p-4 rounded-2xl border border-[#1F1F1F] transition-all duration-300 hover:border-[#2a2a2a]">
      <p className="text-white/50 text-xs font-medium">{label}</p>
      <p className="font-semibold text-white/90 mt-1">{value}</p>
    </div>
  );
}
