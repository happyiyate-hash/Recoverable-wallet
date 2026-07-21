'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { fetchChartData } from '@/lib/coingecko';
import { Skeleton } from './ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface CandleChartProps {
    coingeckoId?: string | null;
    chainId?: number;
    contractAddress?: string;
    days: string;
    currentPrice?: number;
}

export default function CandleChart({ coingeckoId, chainId, contractAddress, days }: CandleChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        console.log("CANDLE INPUT:", { coingeckoId, chainId, contractAddress, days });

        /**
         * ✅ FIX 1: NEVER run without valid ID
         */
        if (!coingeckoId) {
            setLoading(false);
            setError(true);
            return;
        }

        if (!chartContainerRef.current) return;

        /**
         * ✅ FIX 2: Create chart ONCE
         */
        if (!chartRef.current) {
            const chart = createChart(chartContainerRef.current, {
                layout: {
                    background: { type: ColorType.Solid, color: 'transparent' },
                    textColor: 'rgba(255, 255, 255, 0.4)',
                },
                grid: {
                    vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
                    horzLines: { color: 'rgba(255, 255, 255, 0.02)' },
                },
                width: chartContainerRef.current.clientWidth,
                height: 180,
                timeScale: {
                    borderVisible: false,
                    timeVisible: true,
                    secondsVisible: false,
                },
                rightPriceScale: {
                    borderVisible: false,
                },
                handleScroll: false,
                handleScale: false,
            });

            const series = chart.addCandlestickSeries({
                upColor: '#22c55e',
                downColor: '#ef4444',
                borderVisible: false,
                wickUpColor: '#22c55e',
                wickDownColor: '#ef4444',
            });

            chartRef.current = chart;
            seriesRef.current = series;

            const handleResize = () => {
                if (chartContainerRef.current) {
                    chart.applyOptions({ width: chartContainerRef.current.clientWidth });
                }
            };

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                chart.remove();
                chartRef.current = null;
                seriesRef.current = null;
            };
        }

        /**
         * ✅ FETCH REAL OHLC DATA
         */
        const fetchData = async () => {
            setLoading(true);
            setError(false);

            try {
                /**
                 * 🔥 IMPORTANT: your fetchChartData MUST support OHLC
                 */
                const res = await fetchChartData(coingeckoId, days, undefined, chainId, contractAddress, 'ohlc');

                if (res && Array.isArray(res) && res.length > 0) {
                    const formatted = res.map((candle: any) => ({
                        time: candle[0] / 1000, // seconds
                        open: candle[1],
                        high: candle[2],
                        low: candle[3],
                        close: candle[4],
                    }));

                    seriesRef.current?.setData(formatted);
                    chartRef.current?.timeScale().fitContent();
                } else {
                    console.warn('[CANDLE] Empty OHLC, fallback to line conversion');

                    /**
                     * ✅ SAFE fallback (only if needed)
                     */
                    const line = await fetchChartData(coingeckoId, days);

                    if (line && line.length > 0) {
                        const fallback = line.map((p: any) => ({
                            time: p.time / 1000,
                            open: p.price,
                            high: p.price,
                            low: p.price,
                            close: p.price,
                        }));

                        seriesRef.current?.setData(fallback);
                    } else {
                        setError(true);
                    }
                }
            } catch (e) {
                console.error("[CANDLE_FETCH_FAIL]", e);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

    }, [coingeckoId, days]);

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <Skeleton className="w-[90%] h-32 rounded-[2.5rem] bg-white/5 animate-pulse" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <AlertCircle className="w-6 h-6 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                    Candle Data Unavailable
                </p>
            </div>
        );
    }

    return <div ref={chartContainerRef} className="w-full h-full" />;
}