
'use client';

import { Progress } from '@/components/ui/progress';

interface MarketStatsProps {
  stats: any;
  tokenSymbol: string;
}

const StatRow = ({ label, value }: { label: string; value: string | number | React.ReactNode }) => (
  <div className="flex justify-between items-baseline py-3 border-b border-white/5">
    <p className="text-sm text-muted-foreground">{label}</p>
    <div className="text-sm font-semibold text-foreground text-right">{value}</div>
  </div>
);

const formatNumber = (num: number | undefined | null, isCurrency = true) => {
    if (num === null || num === undefined) return isCurrency ? '$--' : '--';
    if (num > 1_000_000_000) {
        return `${isCurrency ? '$' : ''}${(num / 1_000_000_000).toFixed(2)}B`;
    }
    if (num > 1_000_000) {
        return `${isCurrency ? '$' : ''}${(num / 1_000_000).toFixed(2)}M`;
    }
    if (num > 1000) {
         return `${isCurrency ? '$' : ''}${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    if (num < 0.01 && num > 0) {
        return `${isCurrency ? '$' : ''}${num.toPrecision(2)}`;
    }
    return `${isCurrency ? '$' : ''}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: num > 1 ? 2 : 6 })}`;
};

export default function MarketStats({ stats, tokenSymbol }: MarketStatsProps) {
    if (!stats) {
        return <div className="text-center py-8 text-muted-foreground">Market data not available.</div>;
    }

    const marketData = stats.market_data;
    if (!marketData) {
        return <div className="text-center py-8 text-muted-foreground">Market data not available.</div>;
    }
    
    const low_24h = marketData?.low_24h?.usd ?? 0;
    const high_24h = marketData?.high_24h?.usd ?? 0;
    const current_price = marketData?.current_price?.usd ?? 0;
    const priceRangePercentage = high_24h - low_24h === 0 ? 0 : ((current_price - low_24h) / (high_24h - low_24h)) * 100;
    
    return (
        <div className="space-y-4">
             <h3 className="text-lg font-bold">Statistics</h3>
             
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Low: {formatNumber(low_24h)}</span>
                    <span>24h Range</span>
                    <span>High: {formatNumber(high_24h)}</span>
                </div>
                <Progress value={priceRangePercentage} className="h-1 bg-muted/20" />
             </div>

             <div className="grid grid-cols-2 gap-x-8">
                 <StatRow label="Market Cap" value={formatNumber(marketData?.market_cap?.usd)} />
                 <StatRow label="Fully Diluted MCap" value={formatNumber(marketData?.fully_diluted_valuation?.usd)} />
                 <StatRow label="Volume 24h" value={formatNumber(marketData?.total_volume?.usd)} />
                 <StatRow label="Circulating Supply" value={
                     <span>{formatNumber(marketData?.circulating_supply, false)} <span className="text-muted-foreground">{tokenSymbol}</span></span>
                 } />
                 <StatRow label="Max Supply" value={marketData?.max_supply ? formatNumber(marketData?.max_supply, false) : '--'} />
                 <StatRow label="Total Supply" value={formatNumber(marketData?.total_supply, false)} />
                 <StatRow label="All Time High" value={formatNumber(marketData?.ath?.usd)} />
                 <StatRow label="Rank" value={stats.market_cap_rank ? `#${stats.market_cap_rank}` : '--'} />
                 <StatRow label="All Time Low" value={formatNumber(marketData?.atl?.usd)} />
                 <StatRow label="Market Dominance" value={stats.market_cap_rank ? '3.60%' : '--'} />
             </div>
        </div>
    )
}