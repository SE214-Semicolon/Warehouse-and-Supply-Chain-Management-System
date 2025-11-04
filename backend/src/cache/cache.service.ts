import { Injectable, Logger } from '@nestjs/common';
import { CACHE_TTL } from './cache.constants';
import { CacheConfig, CacheKey, CacheOptions } from './interfaces/cache.interface';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private store = new Map<string, { value: any; expiresAt: number | null }>();

  private buildKey(key: string | CacheKey): string {
    if (typeof key === 'string') {
      return key;
    }
    return key.prefix ? `${key.prefix}${key.key}` : key.key;
  }

  async get<T>(key: string | CacheKey): Promise<T | null> {
    try {
      const cacheKey = this.buildKey(key);
      const entry = this.store.get(cacheKey);
      if (!entry) return null;
      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        this.store.delete(cacheKey);
        return null;
      }
      return entry.value as T;
    } catch (error) {
      this.logger.error(
        `Error getting cache key ${typeof key === 'string' ? key : key.key}:`,
        error,
      );
      return null;
    }
  }

  async set(key: string | CacheKey, value: any, options: CacheConfig = {}): Promise<void> {
    try {
      const cacheKey = this.buildKey(key);
      const ttl = options.ttl ?? CACHE_TTL.DEFAULT;
      const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;
      this.store.set(cacheKey, { value, expiresAt });
    } catch (error) {
      this.logger.error(
        `Error setting cache key ${typeof key === 'string' ? key : key.key}:`,
        error,
      );
    }
  }

  async delete(key: string | CacheKey): Promise<void> {
    try {
      const cacheKey = this.buildKey(key);
      this.store.delete(cacheKey);
    } catch (error) {
      this.logger.error(
        `Error deleting cache key ${typeof key === 'string' ? key : key.key}:`,
        error,
      );
    }
  }

  async getOrSet<T>(
    key: string | CacheKey,
    factory: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    if (options.skipCache) {
      return factory();
    }

    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      const keys: string[] = [];
      for (const key of this.store.keys()) {
        if (key.startsWith(prefix)) keys.push(key);
      }
      keys.forEach((k) => this.store.delete(k));
    } catch (error) {
      this.logger.error(`Error deleting cache by prefix ${prefix}:`, error);
    }
  }

  async reset(): Promise<void> {
    try {
      this.store.clear();
    } catch (error) {
      this.logger.error('Error resetting cache:', error);
    }
  }

  async warmup<T>(
    keys: (string | CacheKey)[],
    factory: (key: string) => Promise<T>,
    options: CacheConfig = {},
  ): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        const value = await factory(typeof key === 'string' ? key : key.key);
        await this.set(key, value, options);
      }),
    );
  }
}
