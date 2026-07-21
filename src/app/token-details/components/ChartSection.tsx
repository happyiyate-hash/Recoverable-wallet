import React from 'react';
import RechartsChart from '@/components/RechartsChart';
import CandleChart from '@/components/CandleChart';

export default function ChartSection({ 
    coingeckoId, 
    chainId, 
    contractAddress, 
    chartRange, 
    isNegative, 
    currentPrice,
    chartType = 'line'
}: any) {
  return (
    <div className="bg-[#111111] p-2 rounded-2xl border border-[#1F1F1F] shadow-lg">
      <div className="h-[280px] w-full relative">
        {chartType === 'line' ? (
          <RechartsChart 
            coingeckoId={coingeckoId} 
            days={chartRange} 
            isNegative={isNegative} 
            chainId={chainId} 
            contractAddress={contractAddress} 
            currentPrice={currentPrice} 
          />
        ) : (
          <CandleChart 
            coingeckoId={coingeckoId} 
            chainId={chainId} 
            contractAddress={contractAddress} 
            days={chartRange} 
            currentPrice={currentPrice} 
          />
        )}
      </div>
    </div>
  );
}
