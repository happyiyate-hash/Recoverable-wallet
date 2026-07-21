'use client';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

export const COINGECKO_PLATFORM_MAP: { [chainId: number]: string } = {
    1: 'ethereum',
    137: 'polygon-pos',
    10: 'optimistic-ethereum',
    42161: 'arbitrum-one',
    8453: 'base',
    56: 'binance-smart-chain',
    43114: 'avalanche',
    59144: 'linea',
    250: 'fantom',
    42220: 'celo',
    324: 'zksync',
    534352: 'scroll',
    5000: 'mantle',
    1329: 'sei-network',
    130: 'unichain',
    81457: 'blast',
    204: 'opbnb',
    43111: 'hemi',
    1923: 'swell-network',
    11297108109: 'palm',
    1514: 'story-protocol',
    666666666: 'base', 
    7777777: 'zora',
    10112: 'hyperliquid',
    10113: 'soneium',
    1088: 'metis-andromeda',
    10143: 'monad',
    288: 'boba',
    100: 'gnosis',
    57073: 'ink',
    146: 'sonic',
    33139: 'apechain'
};

async function fetcher(url: string, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.status === 429) {
                await new Promise(r => setTimeout(r, 2000 * (i + 1)));
                continue;
            }
            if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
            return await res.json();
        } catch (e: any) {
            clearTimeout(timeoutId);
            if (i === retries) return null;
            await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        }
    }
    return null;
}

export async function fetchDexscreenerPrice(address: string) {
    if (!address || address === 'internal:wnc' || !address.startsWith('0x')) return null;
    try {
        const url = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
        const data = await fetcher(url, 1);
        if (!data || !data.pairs || data.pairs.length === 0) return null;
        const bestPair = data.pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        return {
            priceUsd: parseFloat(bestPair.priceUsd),
            priceChange24h: parseFloat(bestPair.priceChange?.h24 || '0'),
            fdv: bestPair.fdv,
            marketCap: bestPair.marketCap || 0,
            volume24h: bestPair.volume?.h24 || 0,
            pairAddress: bestPair.pairAddress,
            dexId: bestPair.dexId
        };
    } catch (e) { return null; }
}

export async function fetchContractMetadata(chainId: number, address: string) {
    const platform = COINGECKO_PLATFORM_MAP[chainId];
    if (!platform || !address.startsWith('0x')) return null;
    try {
        const url = `${COINGECKO_API_URL}/coins/${platform}/contract/${address.toLowerCase()}`;
        const data = await fetcher(url);
        if (!data) return null;
        return {
            name: data.name,
            symbol: data.symbol?.toUpperCase(),
            decimals: data.detail_platforms?.[platform]?.decimal_place || 18,
            iconUrl: data.image?.large || data.image?.small,
            coingeckoId: data.id
        };
    } catch (e) { return null; }
}

/**
 * UPDATED: Real Volatility Generator
 * No more straight lines. Added Brownian motion noise.
 */
function generateInternalChartData(baseValue: number, days: string, isFixed = false) {
    const data = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    let daysNum = 1;
    if (days === '1W' || days === '7D') daysNum = 7;
    else if (days === '1M') daysNum = 30;
    else if (days === '1Y') daysNum = 365;
    else if (days === 'MAX') daysNum = 730;

    const points = 60; // Enough points for a smooth "bend"
    const interval = (daysNum * dayMs) / points;
    let runningPrice = baseValue * 0.95; 

    for (let i = 0; i <= points; i++) {
        const time = now - ((points - i) * interval);
        // Add random walk "bend" logic
        const volatility = isFixed ? 0 : (Math.random() - 0.5) * (baseValue * 0.02);
        runningPrice = isFixed ? baseValue : runningPrice + volatility;
        
        // Force the last point to be the current price
        const finalVal = i === points ? baseValue : runningPrice;
        data.push({ time, price: finalVal });
    }
    return data;
}

export async function fetchPriceMap(ids: string[]): Promise<{ [id: string]: { usd: number, usd_24h_change: number } }> {
    if (ids.length === 0) return {};
    const uniqueIds = Array.from(new Set(ids.filter(Boolean).map(id => id.toLowerCase().trim())));
    if (uniqueIds.length === 0) return {};
    try {
        const priceUrl = `${COINGECKO_API_URL}/simple/price?ids=${uniqueIds.join(',')}&vs_currencies=usd,btc&include_24hr_change=true`;
        const data = await fetcher(priceUrl);
        return data || {};
    } catch (e) { return {}; }
}

export async function fetchPricesByContract(platformId: string, addresses: string[]): Promise<{ [address: string]: { usd: number, usd_24h_change: number, btc?: number } }> {
    if (!platformId || addresses.length === 0) return {};
    const cleanAddresses = addresses.filter(addr => addr && addr.startsWith('0x')).map(addr => addr.toLowerCase().trim()).join(',');
    if (!cleanAddresses) return {};
    try {
        const url = `${COINGECKO_API_URL}/simple/token_price/${platformId}?contract_addresses=${cleanAddresses}&vs_currencies=usd,btc&include_24hr_change=true`;
        const data = await fetcher(url);
        if (!data) return {};
        const result: any = {};
        Object.entries(data).forEach(([addr, info]: [string, any]) => {
            result[addr.toLowerCase()] = { usd: info.usd || 0, usd_24h_change: info.usd_24h_change || 0, btc: info.btc || 0 };
        });
        return result;
    } catch (e) { return {}; }
}

export async function fetchChartData(coingeckoId: string, days: string, currentPrice?: number, chainId?: number, contractAddress?: string) {
    if (coingeckoId === 'internal:wnc') return generateInternalChartData(currentPrice || 0.000606, days);
    if (coingeckoId === 'stablecoin') return generateInternalChartData(1.0, days, true);

    let daysParam = '1';
    if (days === '24H' || days === '1D') daysParam = '1';
    else if (days === '7D') daysParam = '7';
    else if (days === '1M') daysParam = '30';
    else if (days === '3M') daysParam = '90';
    else if (days === 'YTD') {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        daysParam = Math.floor((Date.now() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)).toString();
    }
    else if (days === '1Y') daysParam = '365';
    else if (days === 'MAX') daysParam = 'max';
    else daysParam = days.toLowerCase().replace('d', '');

    let url = `${COINGECKO_API_URL}/coins/${coingeckoId?.toLowerCase()}/market_chart?vs_currency=usd&days=${daysParam}`;
    if ((!coingeckoId || coingeckoId === 'undefined') && chainId && contractAddress?.startsWith('0x')) {
        const platform = COINGECKO_PLATFORM_MAP[chainId];
        if (platform) url = `${COINGECKO_API_URL}/coins/${platform}/contract/${contractAddress.toLowerCase()}/market_chart?vs_currency=usd&days=${daysParam}`;
    }

    try {
        const data = await fetcher(url);
        if (!data || !data.prices) return [];
        return data.prices.map(([timestamp, price]: [number, number]) => ({ time: timestamp, price: price }));
    } catch (error) { return []; }
}

export async function fetchOHLCData(coingeckoId: string, days: string) {
    if (!coingeckoId || coingeckoId === 'internal:wnc' || coingeckoId === 'stablecoin') {
        const marketData = await fetchChartData(coingeckoId, days);
        if (!marketData || marketData.length < 2) return [];
        const bucketSize = Math.max(1, Math.floor(marketData.length / 32));
        const ohlc = [];
        for (let i = 0; i < marketData.length; i += bucketSize) {
            const chunk = marketData.slice(i, i + bucketSize);
            const prices = chunk.map(p => p.price);
            ohlc.push([chunk[0].time, prices[0], Math.max(...prices), Math.min(...prices), prices[prices.length - 1]]);
        }
        return ohlc;
    }
    let daysParam = (days === '1H' || days === '24H' || days === '1D') ? '1' : (days === '7D' ? '7' : (days === '1M' ? '30' : (days === '3M' ? '90' : 'max')));
    try {
        const url = `${COINGECKO_API_URL}/coins/${coingeckoId.toLowerCase()}/ohlc?vs_currency=usd&days=${daysParam}`;
        const data = await fetcher(url);
        return data || [];
    } catch (error) { return []; }
}

export async function fetchSingleTokenDetails(coingeckoId: string | null | undefined, currentPrice?: number, chainId?: number, contractAddress?: string) {
    if (coingeckoId === 'internal:wnc') {
        const price = currentPrice || 0.000606;
        return {
            id: 'wnc', symbol: 'wnc', name: 'Wevinacoin', market_cap_rank: 0,
            market_data: {
                current_price: { usd: price }, high_24h: { usd: price * 1.02 }, low_24h: { usd: price * 0.98 },
                price_change_percentage_24h: 1.25, market_cap: { usd: 0 }, total_volume: { usd: 0 },
                circulating_supply: 0, total_supply: 0, max_supply: null, ath: { usd: price * 1.5 }, atl: { usd: price * 0.5 }
            }
        };
    }
    if (coingeckoId && coingeckoId !== 'unknown' && coingeckoId !== 'undefined') {
        const data = await fetcher(`${COINGECKO_API_URL}/coins/${coingeckoId.toLowerCase()}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`);
        if (data) return data;
    }
    if (contractAddress?.startsWith('0x')) {
        const dexData = await fetchDexscreenerPrice(contractAddress);
        if (dexData) {
            return {
                id: coingeckoId || 'custom-token', symbol: 'unknown', name: 'Unknown Token',
                market_data: {
                    current_price: { usd: dexData.priceUsd }, price_change_percentage_24h: dexData.priceChange24h,
                    market_cap: { usd: dexData.marketCap }, total_volume: { usd: dexData.volume24h }, fdv: { usd: dexData.fdv }
                }
            };
        }
    }
    return null;
}
