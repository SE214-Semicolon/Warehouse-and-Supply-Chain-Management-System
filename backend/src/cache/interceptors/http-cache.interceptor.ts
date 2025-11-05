import { Injectable, ExecutionContext, CallHandler, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import {
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
  CACHE_OPTIONS_METADATA,
} from '../decorators/cache.decorator';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const key = this.getCacheKey(context);
    const ttl = this.reflector.get(CACHE_TTL_METADATA, context.getHandler());
    const options = this.reflector.get(CACHE_OPTIONS_METADATA, context.getHandler());

    if (!key || options?.skipCache) {
      return next.handle();
    }

    try {
      const value = await this.cacheService.get(key);
      if (value !== null) {
        return of(value);
      }

      return next.handle().pipe(
        tap((response) => {
          this.cacheService.set(key, response, { ttl });
        }),
      );
    } catch {
      return next.handle();
    }
  }

  trackBy(context: ExecutionContext): string | undefined {
    const key = this.reflector.get(CACHE_KEY_METADATA, context.getHandler());
    if (key) {
      return key;
    }

    const request = context.switchToHttp().getRequest();
    if (!request) {
      return undefined;
    }

    // Generate cache key based on HTTP request
    return `${request.method}:${request.url}`;
  }

  private getCacheKey(context: ExecutionContext): string | undefined {
    const key = this.trackBy(context);

    if (!key) {
      return undefined;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Include user context in cache key if available
    if (user?.id) {
      return `${key}:user:${user.id}`;
    }

    return key;
  }
}
