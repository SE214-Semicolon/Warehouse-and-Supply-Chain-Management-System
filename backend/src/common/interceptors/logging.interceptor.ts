import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthenticatedRequest } from '../interfaces/request.interface';
import { MongoDBService } from '../../database/mongodb/mongodb.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly mongodbService: MongoDBService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { method, url, body, query, params, user } = request;
    const correlationId = request.headers['x-correlation-id'] as string;
    const userEmail = user?.email;
    const now = Date.now();

    // Log request
    this.logger.log(`[${correlationId}] ${method} ${url} - Started`);

    return next.handle().pipe(
      tap({
        next: (data: any) => {
          const duration = Date.now() - now;

          // Log successful response
          this.logger.log(`[${correlationId}] ${method} ${url} - Completed (${duration}ms)`);

          // Store detailed log in MongoDB
          this.mongodbService
            .log('info', 'HTTP_REQUEST', 'Request completed', {
              correlationId,
              method,
              url,
              duration,
              user: userEmail,
              request: {
                body,
                query,
                params,
              },
              response: {
                status: context.switchToHttp().getResponse().statusCode,
                body: data,
              },
            })
            .catch((error) => {
              this.logger.error('Failed to store request log', error);
            });
        },
        error: (error: Error) => {
          const duration = Date.now() - now;

          // Log error
          this.logger.error(
            `[${correlationId}] ${method} ${url} - Error (${duration}ms)`,
            error.stack,
          );

          // Store error log in MongoDB
          this.mongodbService
            .log('error', 'HTTP_REQUEST', 'Request failed', {
              correlationId,
              method,
              url,
              duration,
              user: userEmail,
              request: {
                body,
                query,
                params,
              },
              error: {
                message: error.message,
                stack: error.stack,
              },
            })
            .catch((error) => {
              this.logger.error('Failed to store error log', error);
            });
        },
      }),
    );
  }
}
