'use client';

import React, { useState, useEffect } from 'react';

interface NetworkLogoProps {
  symbol: string;
  src?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-16 h-16'
};

/**
 * NETWORK LOGO COMPONENT WITH PERSISTENT CACHING
 * Version: 1.0.0
 * 
 * Solves the "loading forever" problem by:
 * 1. Fetching logo once from network
 * 2. Converting to Base64 and storing in localStorage
 * 3. Loading instantly from cache on subsequent renders
 * 4. Showing professional fallback (letter badge) if logo fails
 */
export const NetworkLogo = ({ 
  symbol, 
  src, 
  className = '',
  size = 'md'
}: NetworkLogoProps) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const cacheKey = `logo_cache_${symbol.toLowerCase()}`;
  const sizeClass = sizeMap[size];

  useEffect(() => {
    // Guard: no src provided
    if (!src) {
      setIsLoading(false);
      setError(true);
      return;
    }

    // 1. CHECK CACHE FIRST
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      setImgSrc(cachedData);
      setIsLoading(false);
      setError(false);
      return;
    }

    // 2. FETCH AND CACHE
    const abortController = new AbortController();

    const fetchAndCache = async () => {
      try {
        const response = await fetch(src, {
          signal: abortController.signal,
          headers: {
            'Cache-Control': 'public, max-age=31536000' // 1 year
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        
        // Convert to Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          
          // Save to cache
          try {
            localStorage.setItem(cacheKey, base64data);
          } catch (e) {
            // localStorage quota exceeded - continue without caching
            console.warn(`[LOGO_CACHE] localStorage quota exceeded for ${symbol}`);
          }
          
          setImgSrc(base64data);
          setIsLoading(false);
          setError(false);
        };
        
        reader.readAsDataURL(blob);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn(`[LOGO_CACHE] Failed to fetch logo for ${symbol}:`, err?.message);
          setError(true);
          setIsLoading(false);
        }
      }
    };

    fetchAndCache();

    // Cleanup
    return () => abortController.abort();
  }, [src, cacheKey, symbol]);

  // ERROR STATE: Show fallback badge
  if (error || !imgSrc) {
    return (
      <div 
        className={`${sizeClass} rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-gray-600 flex-shrink-0 ${className}`}
        title={`${symbol} (logo unavailable)`}
      >
        <span className={`font-bold text-gray-300 ${size === 'sm' ? 'text-[8px]' : size === 'lg' ? 'text-lg' : 'text-xs'}`}>
          {symbol.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  // LOADING STATE: Skeleton
  if (isLoading) {
    return (
      <div 
        className={`${sizeClass} rounded-full bg-gray-800 animate-pulse border border-gray-700 flex-shrink-0 ${className}`}
      />
    );
  }

  // SUCCESS STATE: Cached image
  return (
    <img
      src={imgSrc}
      alt={`${symbol} logo`}
      className={`${sizeClass} rounded-full object-contain border border-gray-600 flex-shrink-0 ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
};

export default NetworkLogo;
