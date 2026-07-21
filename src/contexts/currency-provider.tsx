
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';

/**
 * NEW GLOBAL CURRENCY REGISTRY
 * Standardized data structure for professional valuation.
 */
export interface CurrencyInfo {
  name: string;
  code: string;
  symbol: string;
  country: string;
  flag: string;
}

export const CURRENCY_REGISTRY: CurrencyInfo[] = [
  // Core Global Currencies
  { name: "United States Dollar", code: "USD", symbol: "$", country: "United States", flag: "🇺🇸" },
  { name: "Euro", code: "EUR", symbol: "€", country: "European Union", flag: "🇪🇺" },
  { name: "Japanese Yen", code: "JPY", symbol: "¥", country: "Japan", flag: "🇯🇵" },
  { name: "British Pound", code: "GBP", symbol: "£", country: "United Kingdom", flag: "🇬🇧" },
  { name: "Chinese Yuan", code: "CNY", symbol: "¥", country: "China", flag: "🇨🇳" },
  { name: "Swiss Franc", code: "CHF", symbol: "Fr", country: "Switzerland", flag: "🇨🇭" },
  { name: "Canadian Dollar", code: "CAD", symbol: "CA$", country: "Canada", flag: "🇨🇦" },
  { name: "Australian Dollar", code: "AUD", symbol: "A$", country: "Australia", flag: "🇦🇺" },
  
  // Americas
  { name: "Mexican Peso", code: "MXN", symbol: "Mex$", country: "Mexico", flag: "🇲🇽" },
  { name: "Brazilian Real", code: "BRL", symbol: "R$", country: "Brazil", flag: "🇧🇷" },
  { name: "Argentine Peso", code: "ARS", symbol: "$", country: "Argentina", flag: "🇦🇷" },
  { name: "Chilean Peso", code: "CLP", symbol: "$", country: "Chile", flag: "🇨🇱" },
  { name: "Colombian Peso", code: "COP", symbol: "$", country: "Colombia", flag: "🇨🇴" },
  
  // Europe (Non-Euro)
  { name: "Swedish Krona", code: "SEK", symbol: "kr", country: "Sweden", flag: "🇸🇪" },
  { name: "Norwegian Krone", code: "NOK", symbol: "kr", country: "Norway", flag: "🇳🇴" },
  { name: "Danish Krone", code: "DKK", symbol: "kr", country: "Denmark", flag: "🇩🇰" },
  { name: "Polish Zloty", code: "PLN", symbol: "zł", country: "Poland", flag: "🇵🇱" },
  { name: "Turkish Lira", code: "TRY", symbol: "₺", country: "Turkey", flag: "🇹🇷" },
  
  // Asia
  { name: "Indian Rupee", code: "INR", symbol: "₹", country: "India", flag: "🇮🇳" },
  { name: "South Korean Won", code: "KRW", symbol: "₩", country: "South Korea", flag: "🇰🇷" },
  { name: "Singapore Dollar", code: "SGD", symbol: "S$", country: "Singapore", flag: "🇸🇬" },
  { name: "Hong Kong Dollar", code: "HKD", symbol: "HK$", country: "Hong Kong", flag: "🇭🇰" },
  { name: "Thai Baht", code: "THB", symbol: "฿", country: "Thailand", flag: "🇹🇭" },
  { name: "Indonesian Rupiah", code: "IDR", symbol: "Rp", country: "Indonesia", flag: "🇮🇩" },
  { name: "Philippine Peso", code: "PHP", symbol: "₱", country: "Philippines", flag: "🇵🇭" },
  { name: "Malaysian Ringgit", code: "MYR", symbol: "RM", country: "Malaysia", flag: "🇲🇾" },
  
  // Middle East
  { name: "United Arab Emirates Dirham", code: "AED", symbol: "د.إ", country: "United Arab Emirates", flag: "🇦🇪" },
  { name: "Saudi Riyal", code: "SAR", symbol: "﷼", country: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Qatari Riyal", code: "QAR", symbol: "﷼", country: "Qatar", flag: "🇶🇦" },
  { name: "Israeli New Shekel", code: "ILS", symbol: "₪", country: "Israel", flag: "🇮🇱" },
  
  // Africa
  { name: "South African Rand", code: "ZAR", symbol: "R", country: "South Africa", flag: "🇿🇦" },
  { name: "Nigerian Naira", code: "NGN", symbol: "₦", country: "Nigeria", flag: "🇳🇬" },
  { name: "Egyptian Pound", code: "EGP", symbol: "E£", country: "Egypt", flag: "🇪🇬" },
  { name: "Kenyan Shilling", code: "KES", symbol: "KSh", country: "Kenya", flag: "🇰🇪" },

  // Approved Decentralized Assets
  { name: "Bitcoin", code: "BTC", symbol: "₿", country: "Bitcoin Node", flag: "🪙" }
];

interface CurrencyContextType {
  selectedCurrency: string;
  currencyInfo: CurrencyInfo;
  setCurrency: (code: string) => void;
  rates: { [key: string]: number };
  currentSymbol: string;
  formatFiat: (val: number, decimals?: number) => string;
  convertFromUsd: (val: number) => number;
  isLoadingRates: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

/**
 * INSTITUTIONAL CURRENCY & FOREX ENGINE
 * Version: 5.0.0 (High-Fidelity Value Conversion)
 */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  // Initial rates with hardcoded institutional fallbacks for reliability
  const [rates, setRates] = useState<{ [key: string]: number }>({ 
    USD: 1, 
    NGN: 1650, 
    EUR: 0.92, 
    GBP: 0.79, 
    CAD: 1.35 
  });
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  const currencyInfo = useMemo(() => {
    return CURRENCY_REGISTRY.find(c => c.code === selectedCurrency) || CURRENCY_REGISTRY[0];
  }, [selectedCurrency]);

  const fetchLiveRates = useCallback(async () => {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/exchange_rates');
      const data = await res.json();
      
      if (data && data.rates) {
        const btcToUsdRate = data.rates.usd.value;
        const normalizedRates: { [key: string]: number } = {};
        
        Object.keys(data.rates).forEach(key => {
          const rateData = data.rates[key];
          const code = key.toUpperCase();
          // Logic: (BTC/Local) / (BTC/USD) = USD/Local
          normalizedRates[code] = rateData.value / btcToUsdRate;
        });

        if (!normalizedRates['USD']) normalizedRates['USD'] = 1;

        setRates(prev => ({ ...prev, ...normalizedRates }));
        setIsLoadingRates(false);
      }
    } catch (e) {
      console.warn("[CURRENCY_ENGINE_ADVISORY] Forex handshake deferred.");
      setIsLoadingRates(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selected_currency');
      if (saved && CURRENCY_REGISTRY.some(c => c.code === saved)) {
        setSelectedCurrency(saved);
      }
    }
    
    fetchLiveRates();
    const interval = setInterval(fetchLiveRates, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLiveRates]);

  const setCurrency = useCallback((code: string) => {
    if (CURRENCY_REGISTRY.some(c => c.code === code)) {
      setSelectedCurrency(code);
      if (typeof window !== 'undefined') {
        localStorage.setItem('selected_currency', code);
      }
    }
  }, []);

  const convertFromUsd = useCallback((val: number) => {
    // CRITICAL: Force multiplication by the active exchange rate
    const rate = rates[selectedCurrency] || rates['USD'] || 1;
    return val * rate;
  }, [selectedCurrency, rates]);

  const currentSymbol = currencyInfo.symbol;

  const formatFiat = useCallback((val: number, decimals?: number) => {
    const converted = convertFromUsd(val);
    const precision = decimals !== undefined 
      ? decimals 
      : (converted < 0.01 && converted > 0 ? 6 : 2);
    
    return `${currentSymbol}${converted.toLocaleString('en-US', { 
      minimumFractionDigits: precision, 
      maximumFractionDigits: precision 
    })}`;
  }, [currentSymbol, convertFromUsd]);

  const value = useMemo(() => ({
    selectedCurrency,
    currencyInfo,
    setCurrency,
    rates,
    currentSymbol,
    formatFiat,
    convertFromUsd,
    isLoadingRates
  }), [selectedCurrency, currencyInfo, setCurrency, rates, currentSymbol, formatFiat, convertFromUsd, isLoadingRates]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
};
