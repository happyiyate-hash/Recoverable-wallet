/**
 * INSTITUTIONAL REGISTRY DATABASE (IndexedDB + LocalStorage Mirror)
 * Version: 2.2.0 (High-Speed Sync Standard)
 * 
 * Provides high-speed storage for identity nodes and asset branding.
 * Includes an L1 Memory Cache and L2 LocalStorage mirror to eliminate UI flicker.
 */

const DB_NAME = 'wevina_registry_v2';
const DB_VERSION = 1;
const LS_LOGO_KEY = 'ss-logo-registry-sync';

// L1 MEMORY CACHE: High-speed lookup
let MEMORY_LOGO_CACHE = new Map<string, string>();

/**
 * Hydrates the memory cache from LocalStorage for instant synchronous access.
 * This runs when the module is imported, ensuring data is ready before any component renders.
 */
function hydrateFromLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    const saved = localStorage.getItem(LS_LOGO_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      MEMORY_LOGO_CACHE = new Map(Object.entries(parsed));
    }
  } catch (e) {
    console.warn("[REGISTRY_DB] LS Hydration failed.");
  }
}

// Initial Hydration
hydrateFromLocalStorage();

export interface CachedWallet {
  id: string; // mnemonic fingerprint
  wallets: any[];
  accountNumber: string;
  timestamp: number;
}

class RegistryDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('vault_cache')) {
          db.createObjectStore('vault_cache', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('logo_registry')) {
          db.createObjectStore('logo_registry', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = () => reject(new Error("Registry DB Init Failed"));
    });
  }

  private getScopedKey(userId: string, key: string): string {
    return `${userId}:${key}`;
  }

  async getVault(userId: string, fingerprint: string): Promise<CachedWallet | null> {
    const db = await this.init();
    const scopedKey = this.getScopedKey(userId, fingerprint);
    return new Promise((resolve) => {
      const transaction = db.transaction('vault_cache', 'readonly');
      const store = transaction.objectStore('vault_cache');
      const request = store.get(scopedKey);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  async saveVault(userId: string, data: CachedWallet) {
    const db = await this.init();
    const result = { ...data, id: this.getScopedKey(userId, data.id) };
    return new Promise((resolve) => {
      const transaction = db.transaction('vault_cache', 'readwrite');
      const store = transaction.objectStore('vault_cache');
      store.put(result);
      transaction.oncomplete = () => resolve(true);
    });
  }

  /**
   * Synchronous logo lookup. 
   * Priority: Memory -> LocalStorage Mirror.
   * Ensures zero flicker on mount.
   */
  getLogoSync(id: string): string | null {
    return MEMORY_LOGO_CACHE.get(id) || null;
  }

  /**
   * Smart symbol-based lookup in local storage.
   * Scans for any ID containing the symbol to find a similar logo.
   */
  findLogoBySymbol(symbol: string): string | null {
    if (!symbol || typeof window === 'undefined') return null;
    const search = symbol.toLowerCase();
    
    // Check memory cache first
    for (const [id, url] of MEMORY_LOGO_CACHE.entries()) {
      if (id.includes(search) && url) return url;
    }
    return null;
  }

  /**
   * Asynchronous backup lookup from IndexedDB.
   */
  async getLogo(id: string): Promise<string | null> {
    const sync = this.getLogoSync(id);
    if (sync) return sync;

    try {
      const db = await this.init();
      return new Promise((resolve) => {
        const transaction = db.transaction('logo_registry', 'readonly');
        const store = transaction.objectStore('logo_registry');
        const request = store.get(id);
        request.onsuccess = () => {
          if (request.result?.url) {
            this.updateSyncMirrors(id, request.result.url);
            resolve(request.result.url);
          } else resolve(null);
        };
        request.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  private updateSyncMirrors(id: string, url: string) {
    // 1. Update Memory
    MEMORY_LOGO_CACHE.set(id, url);
    
    // 2. Update LocalStorage Mirror
    if (typeof window !== 'undefined') {
      try {
        const obj = Object.fromEntries(MEMORY_LOGO_CACHE);
        localStorage.setItem(LS_LOGO_KEY, JSON.stringify(obj));
      } catch (e) {
        // Handle LS quota exceeded
        console.warn("[REGISTRY_DB] LS Sync Mirror full.");
      }
    }
  }

  async saveLogo(id: string, url: string) {
    if (!url) return false;
    
    this.updateSyncMirrors(id, url);

    try {
      const db = await this.init();
      return new Promise((resolve) => {
        const transaction = db.transaction('logo_registry', 'readwrite');
        const store = transaction.objectStore('logo_registry');
        store.put({ id, url, timestamp: Date.now() });
        transaction.oncomplete = () => resolve(true);
      });
    } catch (e) {
      return false;
    }
  }

  async purgeAll() {
    MEMORY_LOGO_CACHE.clear();
    if (typeof window !== 'undefined') localStorage.removeItem(LS_LOGO_KEY);
    try {
      const db = await this.init();
      const transaction = db.transaction(['vault_cache', 'logo_registry'], 'readwrite');
      transaction.objectStore('vault_cache').clear();
      transaction.objectStore('logo_registry').clear();
      return new Promise((resolve) => {
        transaction.oncomplete = () => resolve(true);
      });
    } catch (e) {
      return false;
    }
  }
}

export const registryDb = new RegistryDB();
