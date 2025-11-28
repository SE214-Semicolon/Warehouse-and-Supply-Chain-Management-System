import { SetMetadata } from '@nestjs/common';
import type { CacheOptions as ICacheOptions } from '../interfaces/cache.interface';

export const CACHE_KEY_METADATA = 'cache_key_metadata';
export const CACHE_TTL_METADATA = 'cache_ttl_metadata';
export const CACHE_OPTIONS_METADATA = 'cache_options_metadata';

export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);
export const CacheOptions = (options: ICacheOptions) =>
  SetMetadata(CACHE_OPTIONS_METADATA, options);
