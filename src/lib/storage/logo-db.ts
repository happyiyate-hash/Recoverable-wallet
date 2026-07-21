import { registryDb } from './registry-db';
import { getDirectLogoUrl, getFullLogoUrl } from '../getTokenLogo';

// A fast in-memory map holding temporary browser blob pointers
const MEMORY_BLOB_CACHE = new Map<string, string>();
let dbInstance: IDBDatabase | null = null;
let isWarmedUp = false;
let listeners: (() => void)[] = [];

/**
 * Register a listener for when prewarming completes
 */
export function onWarmedUp(callback: () => void) {
  if (isWarmedUp) {
    callback();
    return () => {};
  }
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
}

function notifyWarmedUp() {
  isWarmedUp = true;
  listeners.forEach(cb => {
    try { cb(); } catch (e) {}
  });
  listeners = [];
}

/**
 * Generates a bulletproof unique key for any asset across multiple networks.
 * Handles profiles, network icons, and tokens cleanly.
 */
export function generateCacheKey(params: {
  type: 'token' | 'network' | 'profile';
  chainId?: string | number;
  address?: string;
  symbol?: string;
  userId?: string;
}): string {
  const { type, chainId, address, symbol, userId } = params;
  
  if (type === 'token') {
    // If address is missing, fallback to symbol/name to maintain backwards compatibility
    const identifier = address ? address.toLowerCase() : (symbol || 'unknown').toLowerCase();
    return `token-${chainId || 1}-${identifier}`;
  }
  
  if (type === 'network') {
    if (!chainId) throw new Error("Network icons require a chainId");
    return `network-${chainId}`;
  }
  
  if (type === 'profile') {
    return `profile-${userId || 'current-user'}`;
  }
  
  return 'generic-fallback';
}

/**
 * Guards IndexedDB opening for Safe Next.js SSR builds
 */
async function getDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return null;
  if (dbInstance) return dbInstance;

  return new Promise((resolve) => {
    const request = indexedDB.open('WncWalletLogoCache', 2);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('media_cache')) {
        // keyPath is our compound string built via generateCacheKey()
        db.createObjectStore('media_cache', { keyPath: 'cacheKey' });
      }
    };

    request.onsuccess = (event: any) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
      // Run warmup in background as soon as DB is ready
      warmupLogos();
    };

    request.onerror = () => resolve(null);
  });
}

/**
 * Prewarms the top items into memory on startup so rendering is 100% synchronous
 */
export async function warmupLogos(): Promise<void> {
  const db = await getDB();
  if (!db) {
    notifyWarmedUp();
    return;
  }

  try {
    const tx = db.transaction('media_cache', 'readonly');
    const store = tx.objectStore('media_cache');
    
    // Read the whole store in a single highly optimized transaction batch
    const allEntries = await new Promise<any[]>((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    // Revoke old object URLs to prevent nasty RAM bloat when re-warming
    MEMORY_BLOB_CACHE.forEach((url) => URL.revokeObjectURL(url));
    MEMORY_BLOB_CACHE.clear();

    // Populate RAM cache with native local object URLs
    allEntries.forEach((entry) => {
      if (entry.blob instanceof Blob) {
        const localUrl = URL.createObjectURL(entry.blob);
        MEMORY_BLOB_CACHE.set(entry.cacheKey, localUrl);
      }
    });

    notifyWarmedUp();
  } catch (error) {
    console.error("Failed to prewarm assets:", error);
    notifyWarmedUp();
  }
}

/**
 * INSTANT SYNCHRONOUS LOOKUP
 * Your React component loops can hit this without async promises or transaction delay.
 */
export function getLogoBlobSync(cacheKey: string): string | null {
  return MEMORY_BLOB_CACHE.get(cacheKey) || null;
}

/**
 * SMART NETWORK FETCH AND CACHER (SWR Engine)
 * Handles the fallback flow for missing assets, updates, and profile pictures.
 */
export async function fetchAndCacheLogo(
  remoteUrl: string, 
  cacheKey: string,
  onUpdate?: (newLocalUrl: string) => void
): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // 1. Double check memory/IndexedDB if sync missed it
  let existingLocalUrl = MEMORY_BLOB_CACHE.get(cacheKey);
  
  if (!existingLocalUrl) {
    const db = await getDB();
    if (db) {
      const entry: any = await new Promise((resolve) => {
        const tx = db.transaction('media_cache', 'readonly');
        const req = tx.objectStore('media_cache').get(cacheKey);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      if (entry && entry.blob instanceof Blob) {
        existingLocalUrl = URL.createObjectURL(entry.blob);
        MEMORY_BLOB_CACHE.set(cacheKey, existingLocalUrl);
        if (onUpdate) onUpdate(existingLocalUrl);
      }
    }
  }

  // If we are completely offline, confidently serve what we have (or null)
  if (!navigator.onLine) {
    return existingLocalUrl || null;
  }

  // 2. Background Revalidation fetch from Network
  try {
    const response = await fetch(remoteUrl, { cache: 'no-cache' });
    if (!response.ok) throw new Error('Network asset fetching failed');

    const freshBlob = await response.blob();
    
    // Save to Disk (IndexedDB)
    const db = await getDB();
    if (db) {
      const tx = db.transaction('media_cache', 'readwrite');
      tx.objectStore('media_cache').put({
        cacheKey,
        blob: freshBlob,
        updatedAt: Date.now()
      });
      // Save string mapping in parallel to registry-db
      await registryDb.saveLogo(cacheKey, remoteUrl);
    }

    // Update RAM Cache pointers safely
    const freshLocalUrl = URL.createObjectURL(freshBlob);
    const oldUrl = MEMORY_BLOB_CACHE.get(cacheKey);
    if (oldUrl) URL.revokeObjectURL(oldUrl); // Prevent leaking memory

    MEMORY_BLOB_CACHE.set(cacheKey, freshLocalUrl);

    // Alert React UI context to swap the source smoothly if it changed
    if (onUpdate) onUpdate(freshLocalUrl);

    return freshLocalUrl;
  } catch (error) {
    console.warn(`Could not refresh asset ${cacheKey} from network, fallback used.`, error);
    return existingLocalUrl || null;
  }
}

/**
 * Purges all cached media blobs.
 */
export async function purgeAllLogos(): Promise<boolean> {
  MEMORY_BLOB_CACHE.forEach((url) => URL.revokeObjectURL(url));
  MEMORY_BLOB_CACHE.clear();
  try {
    const db = await getDB();
    if (!db) return false;
    const transaction = db.transaction('media_cache', 'readwrite');
    transaction.objectStore('media_cache').clear();
    return new Promise(resolve => {
      transaction.oncomplete = () => resolve(true);
    });
  } catch (e) {
    return false;
  }
}

/**
 * BACKWARDS COMPATIBILITY INTERFACE
 * Standard warmup helper that processes token lists and warms up the cache.
 */
export async function warmupLogosList(tokens: Array<{ symbol: string; chainId: number; iconUrl?: string | null }>) {
  if (typeof window === 'undefined' || !tokens.length) return;

  const CHUNK_SIZE = 5;
  for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
    const chunk = tokens.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(async (token) => {
      const cacheKey = generateCacheKey({
        type: 'token',
        chainId: token.chainId,
        symbol: token.symbol
      });

      const existing = getLogoBlobSync(cacheKey);
      if (existing) return;

      let url = token.iconUrl;
      if (!url) {
        url = await getDirectLogoUrl(token.symbol, token.symbol, token.chainId);
      }

      if (url) {
        const fullUrl = await getFullLogoUrl(url);
        if (fullUrl) {
          await fetchAndCacheLogo(fullUrl, cacheKey);
        }
      }
    }));
  }
}

