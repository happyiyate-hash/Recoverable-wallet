'use client';

/**
 * INSTITUTIONAL CACHE ENGINE (v1.0.0)
 * Logic: Persistent IndexedDB storage for balances and metadata.
 */

const DB_NAME = 'WNC_WATCHTOWER_CACHE';
const STORE_NAME = 'balances';
const DB_VERSION = 1;

class CacheEngine {
  private db: IDBDatabase | null = null;

  async init() {
    if (this.db) return;

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('CacheEngine Init Error:', event);
        reject();
      };
    });
  }

  async set(key: string, value: any, ttlMs: number = 3600000) {
    await this.init();
    if (!this.db) return;

    const entry = {
      value,
      expiry: Date.now() + ttlMs,
    };

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject();
    });
  }

  async get(key: string): Promise<any | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result;
        if (!entry) return resolve(null);
        if (Date.now() > entry.expiry) {
          this.delete(key);
          return resolve(null);
        }
        resolve(entry.value);
      };
      request.onerror = () => reject();
    });
  }

  async delete(key: string) {
    await this.init();
    if (!this.db) return;

    const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(key);
  }
}

export const cacheEngine = new CacheEngine();
