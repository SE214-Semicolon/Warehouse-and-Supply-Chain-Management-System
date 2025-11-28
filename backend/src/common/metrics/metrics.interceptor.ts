import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly requestCounter: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly requestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, route } = request;
    const path = route?.path || request.url;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode?.toString() || '200';
          const duration = (Date.now() - startTime) / 1000;

          this.requestCounter.inc({ method, path, status_code: statusCode });
          this.requestDuration.observe({ method, path, status_code: statusCode }, duration);
        },
        error: (error) => {
          const statusCode = error.status?.toString() || '500';
          const duration = (Date.now() - startTime) / 1000;

          this.requestCounter.inc({ method, path, status_code: statusCode });
          this.requestDuration.observe({ method, path, status_code: statusCode }, duration);
        },
      }),
    );
  }
}
