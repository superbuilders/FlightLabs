import { FlightData, FlightQueryParams } from '../../types/flightlabs.types';

interface CacheEntry {
  data: FlightData[];
  timestamp: number;
  params: Partial<FlightQueryParams>;
}

/**
 * Cache manager for FlightLabs API responses
 * Helps reduce API calls and improve performance
 */
export class FlightLabsCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly defaultTTL: number;
  private readonly maxEntries: number;

  constructor(ttlSeconds: number = 60, maxEntries: number = 100) {
    this.defaultTTL = ttlSeconds * 1000; // Convert to milliseconds
    this.maxEntries = maxEntries;
  }

  /**
   * Generate cache key from query parameters
   */
  private generateKey(params: Partial<FlightQueryParams>): string {
    // Sort parameters to ensure consistent key generation
    const sortedParams = Object.entries(params)
      .filter(([key]) => key !== 'access_key') // Don't include access key in cache key
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    
    return sortedParams || 'all-flights';
  }

  /**
   * Get cached data if available and not expired
   */
  get(params: Partial<FlightQueryParams>): FlightData[] | null {
    const key = this.generateKey(params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store data in cache
   */
  set(params: Partial<FlightQueryParams>, data: FlightData[]): void {
    const key = this.generateKey(params);

    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      params
    });
  }

  /**
   * Find the oldest cache entry
   */
  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Clear specific cache entry
   */
  invalidate(params: Partial<FlightQueryParams>): void {
    const key = this.generateKey(params);
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttl: number;
    entries: Array<{
      key: string;
      age: number;
      params: Partial<FlightQueryParams>;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      params: entry.params
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxEntries,
      ttl: this.defaultTTL,
      entries
    };
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.defaultTTL) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Check if cache has valid entry for given parameters
   */
  has(params: Partial<FlightQueryParams>): boolean {
    const data = this.get(params);
    return data !== null;
  }
} 