import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../../modules/audit-log/services/audit-log.service';
import { AuditContextInterceptor } from '../../common/interceptors/audit-context.interceptor';

/**
 * Prisma middleware to automatically capture audit logs for entity changes
 * Tracks CREATE, UPDATE, DELETE operations on specified models
 */
@Injectable()
export class AuditMiddleware implements OnModuleInit {
  private readonly logger = new Logger(AuditMiddleware.name);

  // Sensitive fields to mask in audit logs
  private readonly SENSITIVE_FIELDS = [
    'password',
    'passwordHash',
    'refreshToken',
    'apiKey',
    'secret',
    'token',
    'accessToken',
  ];

  // PII fields to partially mask
  private readonly PII_FIELDS = ['email', 'phone', 'phoneNumber'];

  // Entities to audit
  // Note: StockMovement is now audited to track who creates/modifies movement records
  private readonly AUDITED_MODELS = [
    'Product',
    'ProductBatch',
    'ProductCategory',
    'Inventory',
    'Warehouse',
    'Location',
    'StockMovement',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Mask sensitive data in an object recursively
   */
  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.maskSensitiveData(item));
    }

    const masked = { ...data };

    for (const key of Object.keys(masked)) {
      const lowerKey = key.toLowerCase();

      // Completely redact sensitive fields
      if (this.SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
        masked[key] = '[REDACTED]';
        continue;
      }

      // Partially mask PII fields
      if (this.PII_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
        if (typeof masked[key] === 'string') {
          if (lowerKey.includes('email')) {
            // email@example.com → e***@***.com
            masked[key] = this.maskEmail(masked[key]);
          } else if (lowerKey.includes('phone')) {
            // +1234567890 → *****7890
            masked[key] = this.maskPhone(masked[key]);
          }
        }
        continue;
      }

      // Recursively mask nested objects
      if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    }

    return masked;
  }

  /**
   * Mask email: email@example.com → e***@***.com
   */
  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    const maskedLocal = local.charAt(0) + '***';
    const maskedDomain = domain.includes('.') ? '***.' + domain.split('.').pop() : '***' + domain;
    return `${maskedLocal}@${maskedDomain}`;
  }

  /**
   * Mask phone: +1234567890 → *****7890
   */
  private maskPhone(phone: string): string {
    if (!phone || phone.length < 4) return phone;
    return '*'.repeat(phone.length - 4) + phone.slice(-4);
  }

  async onModuleInit() {
    this.logger.log('Registering audit middleware for entity tracking');

    // Type assertion for middleware access
    const client: any = this.prisma as any;
    if (typeof client.$use !== 'function') {
      this.logger.warn(
        'Prisma middleware API ($use) not available. Skipping audit middleware registration.',
      );
      return;
    }

    client.$use(async (params: any, next: any) => {
      // Only audit specified models
      if (!this.AUDITED_MODELS.includes(params.model || '')) {
        return next(params);
      }

      const action = params.action;
      const model = params.model;

      // Track CREATE, UPDATE, DELETE operations
      if (!['create', 'update', 'delete', 'updateMany', 'deleteMany'].includes(action)) {
        return next(params);
      }

      let beforeState = null;
      let entityId = null;

      try {
        // For UPDATE/DELETE: fetch current state before mutation
        if (['update', 'delete'].includes(action)) {
          const idFilter = params.args?.where;
          if (idFilter?.id) {
            entityId = idFilter.id;
            beforeState = await (this.prisma as any)[
              model.charAt(0).toLowerCase() + model.slice(1)
            ].findUnique({
              where: { id: idFilter.id },
            });
          }
        }

        // Execute the actual operation
        const result = await next(params);

        // Extract entity ID after operation
        if (action === 'create') {
          entityId = result?.id;
        }

        // Determine audit action type
        let auditAction = 'UNKNOWN';
        if (action === 'create') auditAction = 'CREATE';
        else if (['update', 'updateMany'].includes(action)) auditAction = 'UPDATE';
        else if (['delete', 'deleteMany'].includes(action)) auditAction = 'DELETE';

        // Write audit log asynchronously (don't block transaction)
        setImmediate(() => {
          const context = AuditContextInterceptor.getContext();

          // Mask sensitive data in before/after states
          const maskedBefore = this.maskSensitiveData(beforeState);
          const maskedAfter = action === 'delete' ? null : this.maskSensitiveData(result);

          this.auditLogService
            .write({
              timestamp: new Date(),
              correlationId: context?.correlationId,
              entityType: model,
              entityId: entityId || 'unknown',
              action: auditAction,
              userId: context?.userId,
              userEmail: context?.userEmail,
              ipAddress: context?.ipAddress,
              method: context?.method,
              path: context?.path,
              before: maskedBefore,
              after: maskedAfter,
              metadata: {
                operation: params.action,
                args: params.args,
              },
            })
            .catch((err) => {
              this.logger.error(`Failed to write audit log for ${model}:${entityId}`, err);
            });
        });

        return result;
      } catch (error) {
        // Re-throw original error, don't let audit failure break business logic
        throw error;
      }
    });

    if (typeof client.$use === 'function') {
      this.logger.log(`Audit middleware active for: ${this.AUDITED_MODELS.join(', ')}`);
    }
  }
}
