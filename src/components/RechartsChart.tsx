'use client';
import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceDot } from 'recharts';
import { fetchChartData } from '@/lib/coingecko';
import { Skeleton } from './ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { useCurrency } from '@/contexts/currency-provider';
import { useMarket } from '@/contexts/market-provider';

interface RechartsChartProps {
    coingeckoId?: string | null;
    days: string;
    isNegative: boolean;
    chainId?: number;
    contractAddress?: string;
    currentPrice?: number;
    customColor?: string;
}

/**
 * INSTITUTIONAL PERSISTENT CHART ENGINE
 * Version: 17.0.0 (Fast Switch + Cache-First Refetch)
 */
const RechartsChart = memo(({ coingeckoId, days, isNegative, chainId, contractAddress, currentPrice, customColor }: RechartsChartProps) => {
    const { chartCache, saveChartToCache } = useMarket();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const { formatFiat } = useCurrency();

    /**
     * ✅ FIX 1: Stable identity key (no collision)
     */
    const resolvedKey = coingeckoId || contractAddress || 'unknown';
    const cacheKey = `${resolvedKey}:${days}`;

    /**
     * ✅ FIX 2: Safe hydration (no undefined crash)
     */
    const [historicalData, setHistoricalData] = useState<any[]>(() => chartCache?.[cacheKey] || []);
    const [livePoints, setLivePoints] = useState<any[]>([]);

    const lastAppendedPriceRef = useRef<number | null>(null);
    const hasInitialFetchCompletedRef = useRef(false);

    /**
     * ✅ DTC FIX: Immediate Cache Switch Logic
     * When 'days' changes, we immediately update state from cache if available.
     * This prevents the "color change only" bug and shows the correct historical shape.
     */
    useEffect(() => {
        const cached = chartCache?.[cacheKey];
        if (cached && Array.isArray(cached)) {
            setHistoricalData(cached);
        } else {
            setHistoricalData([]);
        }
        // Reset live points on timeframe switch
        setLivePoints([]);
    }, [cacheKey]);

    /**
     * 1. BASELINE HISTORY HANDSHAKE (Revalidation)
     */
    useEffect(() => {
        let isMounted = true;

        const resolveAndFetch = async () => {
            /**
             * ✅ FIX 3: NEVER fetch without valid ID
             */
            if (!coingeckoId) {
                console.warn('[Chart] Missing coingeckoId — skipping fetch');
                return;
            }

            /**
             * DTC UPDATE: Loader only if no cached data exists for this specific timeframe
             */
            const currentCache = chartCache?.[cacheKey];
            if (!currentCache || currentCache.length === 0) {
                setLoading(true);
            }

            setError(false);

            try {
                const res = await fetchChartData(coingeckoId, days, currentPrice, chainId, contractAddress);

                /**
                 * ✅ FIX 4: Only update if valid data
                 */
                if (res && Array.isArray(res) && res.length > 0) {
                    if (!isMounted) return;

                    setHistoricalData(res);
                    saveChartToCache(cacheKey, res);
                    // Clear live points when fresh history arrives to prevent duplication
                    setLivePoints([]);
                    hasInitialFetchCompletedRef.current = true;
                } else {
                    /**
                     * ✅ DO NOT wipe UI on empty response
                     */
                    console.warn('[Chart] Empty response — preserving existing data');
                }
            } catch (e) {
                console.error('[Chart] Fetch error:', e);

                /**
                 * Only show error if absolutely nothing exists in state or cache
                 */
                if (historicalData.length === 0) {
                    setError(true);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        resolveAndFetch();

        /**
         * Background refresh every 5 minutes
         */
        const interval = setInterval(resolveAndFetch, 300000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };

        /**
         * ✅ FIX 5: Minimal dependencies (Refetch when ID or Timeframe changes)
         */
    }, [coingeckoId, days, cacheKey]);

    /**
     * 2. LIVE PULSE APPENDER
     */
    useEffect(() => {
        if (!currentPrice || currentPrice === lastAppendedPriceRef.current) return;

        lastAppendedPriceRef.current = currentPrice;
        const now = Date.now();

        setLivePoints(prev => {
            const lastPoint =
                prev.length > 0
                    ? prev[prev.length - 1]
                    : historicalData.length > 0
                    ? historicalData[historicalData.length - 1]
                    : null;

            if (lastPoint && now - lastPoint.time < 5000) return prev;

            const next = [...prev, { time: now, price: currentPrice }];
            return next.slice(-100);
        });
    }, [currentPrice, historicalData]);

    /**
     * 3. COMBINED DATA PIPELINE
     */
    const chartData = useMemo(() => {
        const combined = [...historicalData, ...livePoints];
        if (combined.length === 0) return [];

        if (currentPrice) {
            const final = [...combined];
            const lastIdx = final.length - 1;

            final[lastIdx] = {
                ...final[lastIdx],
                price: currentPrice,
                time: Date.now()
            };

            return final;
        }

        return combined;
    }, [historicalData, livePoints, currentPrice]);

    /**
     * UI STATES
     */
    if (loading && historicalData.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-transparent">
                <Skeleton className="w-[90%] h-32 rounded-[2.5rem] bg-white/5 animate-pulse" />
            </div>
        );
    }

    if (error && historicalData.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <AlertCircle className="w-6 h-6 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                    Market Registry Offline
                </p>
            </div>
        );
    }

    /**
     * STYLING
     */
    const linecolor = customColor || (isNegative ? '#ef4444' : '#22c55e');
    const fillcolor = customColor || (isNegative ? '#ef4444' : '#22c55e');

    const formatPriceLabel = (p: number) => {
        if (p >= 1) return p.toFixed(2);
        if (p > 0.01) return p.toFixed(4);
        return p.toFixed(6);
    };

    const lastDataPoint = chartData[chartData.length - 1];

    /**
     * RENDER
     */
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                <defs>
                    <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={fillcolor} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={fillcolor} stopOpacity={0} />
                    </linearGradient>
                </defs>

                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.02)" strokeDasharray="3 3" />

                <XAxis dataKey="time" hide type="number" domain={['dataMin', 'dataMax']} />

                <YAxis
                    domain={['auto', 'auto']}
                    orientation="left"
                    axisLine={false}
                    tickLine={false}
                    width={60}
                    tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: 900 }}
                    tickFormatter={(val) => `${formatPriceLabel(val)}`}
                />

                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(5, 5, 5, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '1.5rem',
                        backdropFilter: 'blur(10px)',
                        padding: '12px'
                    }}
                    labelStyle={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '10px',
                        fontWeight: 'bold'
                    }}
                    itemStyle={{
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: '900'
                    }}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    formatter={(value: any) => [formatFiat(value), 'Price']}
                />

                <Area
                    type="monotone"
                    dataKey="price"
                    stroke={linecolor}
                    fill="url(#chart-fill)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: linecolor, stroke: '#000', strokeWidth: 2 }}
                    isAnimationActive={false}
                    connectNulls={true}
                />

                {lastDataPoint && (
                    <ReferenceDot
                        x={lastDataPoint.time}
                        y={lastDataPoint.price}
                        r={0}
                        isFront={true}
                        shape={(props: any) => {
                            const { cx, cy } = props;
                            return (
                                <g>
                                    <circle cx={cx} cy={cy} r="4" fill={linecolor} opacity="0.6">
                                        <animate attributeName="r" from="4" to="16" dur="2s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                                    </circle>
                                    <circle cx={cx} cy={cy} r="3" fill={linecolor} stroke="#050505" strokeWidth="1.5" />
                                    <g transform={`translate(${cx - 55}, ${cy - 10})`}>
                                        <rect width="50" height="18" rx="6" fill={linecolor} />
                                        <text x="25" y="12" textAnchor="middle" fill="white" fontSize="9" fontWeight="900">
                                            {formatPriceLabel(lastDataPoint.price)}
                                        </text>
                                    </g>
                                </g>
                            );
                        }}
                    />
                )}
            </AreaChart>
        </ResponsiveContainer>
    );
});

RechartsChart.displayName = 'RechartsChart';
export default RechartsChart;