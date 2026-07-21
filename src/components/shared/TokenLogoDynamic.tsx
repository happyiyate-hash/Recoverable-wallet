'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo, useRef } from 'react';
import CachedImage from '../CachedImage';
import GenericCoinIcon from '../icons/GenericCoinIcon';
import { getDirectLogoUrl, getFullLogoUrl } from '@/lib/getTokenLogo';
import { registryDb } from '@/lib/storage/registry-db';
import { getLogoBlobSync, fetchAndCacheLogo, onWarmedUp, generateCacheKey } from '@/lib/storage/logo-db';
import { cn } from '@/lib/utils';

interface TokenLogoDynamicProps {
  logoUrl?: string | null | undefined;
  alt?: string;
  size?: number;
  className?: string;
  FallbackComponent?: React.ReactElement;
  chainId?: number;
  symbol?: string; 
  name?: string;
  priority?: boolean;
  address?: string;
}

// ABSOLUTE WNC IDENTITY NODE (LOCAL)
const WNC_LOGO_URL = '/icons/iconwnc.png';

/**
 * INSTITUTIONAL SMART LOGO ENGINE
 * Version: 51.0.0 (Zero-Stale Handshake Standard)
 * 
 * Rules:
 * 1. ZERO-STALE: Immediately clears old state when symbol/chainId changes.
 * 2. SYNC PRIORITY: Synchronously checks Memory/LocalStorage before render.
 * 3. BINARY CACHE: Prioritizes local IndexedDB Blobs to prevent CDN flickering.
 */
export default function TokenLogoDynamic({
  logoUrl,
  alt,
  size = 32,
  className,
  FallbackComponent,
  chainId,
  symbol,
  name,
  priority = false,
  address
}: TokenLogoDynamicProps) {
  
  // 1. GENERATE UNIQUE IDENTITY KEY
  const cacheId = useMemo(() => {
    return generateCacheKey({
      type: 'token',
      chainId,
      address,
      symbol: symbol || name || alt
    });
  }, [symbol, name, alt, chainId, address]);

  const isWncNode = useMemo(() => {
    const s = (symbol || '').toUpperCase();
    const n = (name || '').toUpperCase();
    return s === 'WNC' || n === 'WEVINACOIN';
  }, [symbol, name]);

  // 2. SYNCHRONOUS INITIALIZATION (Prevents old logo flickering)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(() => {
    if (isWncNode) return WNC_LOGO_URL;
    // Check prewarmed binary cache first
    const binaryHit = getLogoBlobSync(cacheId);
    if (binaryHit) return binaryHit;
    // Immediate lookup in fast memory sync to ensure zero-flicker on swap
    return registryDb.getLogoSync(cacheId);
  });

  const [isInitializing, setIsInitializing] = useState(true);
  const [hasRecovered, setHasRecovered] = useState(false);
  const isFetchingRef = useRef(false);

  // 2.5 LISTEN FOR PREWARM COMPLETION (Handles loading race conditions)
  useEffect(() => {
    if (isWncNode) return;

    const unsubscribe = onWarmedUp(() => {
      const binaryHit = getLogoBlobSync(cacheId);
      if (binaryHit) {
        setResolvedUrl(binaryHit);
        setIsInitializing(false);
      }
    });

    return unsubscribe;
  }, [cacheId, isWncNode]);

  // 3. ATOMIC HANDSHAKE OBSERVER
  useEffect(() => {
    let isMounted = true;

    // 🛡️ CRITICAL FIX: Reset URL immediately when cacheId changes to stop "Over-Caching"
    const binaryHit = isWncNode ? null : getLogoBlobSync(cacheId);
    const syncHit = isWncNode ? WNC_LOGO_URL : (binaryHit || registryDb.getLogoSync(cacheId));
    setResolvedUrl(syncHit);
    setIsInitializing(!syncHit);

    async function resolve() {
      if (isWncNode) {
        if (isMounted) {
          setResolvedUrl(WNC_LOGO_URL);
          setIsInitializing(false);
        }
        return;
      }

      // Check synchronous cache first (already warmed up)
      const syncBlob = getLogoBlobSync(cacheId);
      if (syncBlob && isMounted) {
        setResolvedUrl(syncBlob);
        setIsInitializing(false);
        if (navigator.onLine && !priority) {
          backgroundRefresh();
        }
        return;
      }

      // TIER 2: REGISTRY DB (URL Strings)
      try {
        const cachedUrl = await registryDb.getLogo(cacheId);
        if (cachedUrl && isMounted) {
          const full = await getFullLogoUrl(cachedUrl);
          if (full) {
            setResolvedUrl(full);
            setIsInitializing(false);
            // Convert to blob in background if online to ensure future offline access
            if (navigator.onLine) {
              fetchAndCacheLogo(full, cacheId, (updatedUrl) => {
                if (isMounted) setResolvedUrl(updatedUrl);
              });
            }
            return;
          }
        }
      } catch (e) {}

      // TIER 3: NETWORK HANDSHAKE (Online Only)
      if (navigator.onLine) {
        await backgroundRefresh();
      } else {
        if (isMounted) setIsInitializing(false);
      }
    }

    async function backgroundRefresh() {
      if (isFetchingRef.current || !isMounted) return;
      isFetchingRef.current = true;

      try {
        let finalUrl: string | null = null;
        if (typeof logoUrl === 'string' && logoUrl.length > 0) {
          finalUrl = await getFullLogoUrl(logoUrl);
        } else {
          finalUrl = await getDirectLogoUrl(name || alt || '', symbol || '', chainId);
        }

        if (finalUrl && isMounted) {
          // Fetch from network and save to IndexedDB with background refresh SWR
          await fetchAndCacheLogo(finalUrl, cacheId, (updatedUrl) => {
            if (isMounted) {
              setResolvedUrl(updatedUrl);
            }
          });
        }
      } catch (e) {
        console.warn("[LOGO_ENGINE] Refresh deferred.");
      } finally {
        if (isMounted) setIsInitializing(false);
        isFetchingRef.current = false;
      }
    }

    resolve();
    return () => { isMounted = false; };
  }, [cacheId, isWncNode, logoUrl, symbol, name, chainId, priority]);

  const handleSmartRecovery = async () => {
    if (hasRecovered || isWncNode || !symbol) return;
    setHasRecovered(true);

    const localMatch = registryDb.findLogoBySymbol(symbol);
    if (localMatch && localMatch !== resolvedUrl) {
      const fullLocal = await getFullLogoUrl(localMatch);
      if (fullLocal) {
        setResolvedUrl(fullLocal);
        return;
      }
    }

    if (navigator.onLine) {
      try {
        const fallbackUrl = await getDirectLogoUrl(symbol, symbol, chainId);
        if (fallbackUrl) {
          setResolvedUrl(fallbackUrl);
          await registryDb.saveLogo(cacheId, fallbackUrl);
          await fetchAndCacheLogo(fallbackUrl, cacheId, (updatedUrl) => {
            setResolvedUrl(updatedUrl);
          });
        }
      } catch (e) {}
    }
  };


  const effectiveAlt = alt || symbol || name || "Token Logo";

  if (isInitializing && !resolvedUrl) {
    return (
      <div style={{ width: size, height: size }} className={cn("shrink-0 flex items-center justify-center", className)}>
        <div className="w-full h-full rounded-full bg-white/[0.05] border border-white/5 animate-pulse" />
      </div>
    );
  }

  if (!resolvedUrl) {
    return (
      <div style={{ width: size, height: size }} className={cn("shrink-0 flex items-center justify-center", className)}>
        {FallbackComponent || <GenericCoinIcon size={size} />}
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size }} className={cn("shrink-0 flex items-center justify-center relative overflow-hidden rounded-full", className)}>
      <CachedImage
        src={resolvedUrl}
        alt={effectiveAlt}
        width={size}
        height={size}
        className="rounded-full object-cover"
        unoptimized
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        onError={handleSmartRecovery}
      />
    </div>
  );
}
