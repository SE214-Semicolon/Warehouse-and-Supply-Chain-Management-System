export interface CacheConfig {
  ttl?: number;
  prefix?: string;
}

export interface CacheKey {
  key: string;
  prefix?: string;
}

export interface CacheOptions extends CacheConfig {
  skipCache?: boolean;
}
