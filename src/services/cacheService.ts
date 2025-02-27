/**
 * Cache Service
 * Provides caching functionality for API responses
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Cache key prefix */
  prefix?: string;
}

export class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL: number;
  private keyPrefix: string;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // Default: 5 minutes
    this.keyPrefix = options.prefix || 'api-cache:';
  }

  /**
   * Generates a cache key for the given parameters
   */
  private generateKey(url: string, params?: Record<string, any>): string {
    let key = `${this.keyPrefix}${url}`;
    if (params) {
      key += `:${JSON.stringify(params)}`;
    }
    return key;
  }

  /**
   * Gets an item from the cache
   * @returns The cached data or null if not found or expired
   */
  get<T>(url: string, params?: Record<string, any>): T | null {
    const key = this.generateKey(url, params);
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Sets an item in the cache
   * @param ttl Time-to-live in milliseconds (optional, uses default if not provided)
   */
  set<T>(url: string, data: T, params?: Record<string, any>, ttl?: number): void {
    const key = this.generateKey(url, params);
    const now = Date.now();

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttl || this.defaultTTL)
    });
  }

  /**
   * Removes an item from the cache
   */
  remove(url: string, params?: Record<string, any>): void {
    const key = this.generateKey(url, params);
    this.cache.delete(key);
  }

  /**
   * Clears all items from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clears expired items from the cache
   * @returns Number of items removed
   */
  clearExpired(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Gets cache statistics
   */
  getStats(): { size: number; oldestTimestamp: number | null } {
    let oldestTimestamp: number | null = null;

    for (const item of this.cache.values()) {
      if (oldestTimestamp === null || item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
      }
    }

    return {
      size: this.cache.size,
      oldestTimestamp
    };
  }

  /**
   * Wraps an async function with caching
   * @param fn The function to wrap
   * @param url The URL to use as cache key
   * @param params Additional parameters for the cache key
   * @param ttl Time-to-live in milliseconds (optional)
   */
  async withCache<T>(
    fn: () => Promise<T>,
    url: string,
    params?: Record<string, any>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cachedData = this.get<T>(url, params);
    if (cachedData !== null) {
      return cachedData;
    }

    // If not in cache, call the function
    const data = await fn();

    // Store in cache
    this.set(url, data, params, ttl);

    return data;
  }
}

// Create a singleton instance
export const apiCache = new CacheService({
  ttl: 10 * 60 * 1000, // 10 minutes
  prefix: 'docker-registry:'
}); 