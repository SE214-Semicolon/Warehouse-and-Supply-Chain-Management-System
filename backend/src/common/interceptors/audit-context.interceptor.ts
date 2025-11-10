import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export const AUDIT_CONTEXT = Symbol('AUDIT_CONTEXT');

export interface AuditContext {
  userId?: string;
  userEmail?: string;
  correlationId?: string;
  ipAddress?: string;
  method?: string;
  path?: string;
}

/**
 * Interceptor to inject HTTP request context into audit logs
 * Stores context globally for Prisma middleware to access
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  private static currentContext: AuditContext | null = null;

  static getContext(): AuditContext | null {
    return this.currentContext;
  }

  static setContext(ctx: AuditContext | null): void {
    this.currentContext = ctx;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const auditContext: AuditContext = {
      userId: user?.id,
      userEmail: user?.email,
      correlationId: request.headers['x-correlation-id'] || request.id,
      ipAddress: request.ip || request.connection.remoteAddress,
      method: request.method,
      path: request.url,
    };

    AuditContextInterceptor.setContext(auditContext);

    return next.handle().pipe(
      tap({
        finalize: () => {
          // Clear context after request completes
          AuditContextInterceptor.setContext(null);
        },
      }),
    );
  }
}
