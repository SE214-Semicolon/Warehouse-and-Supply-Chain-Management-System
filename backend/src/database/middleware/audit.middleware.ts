import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../../modules/audit-log/services/audit-log.service';
import { AuditContextInterceptor } from '../../common/interceptors/audit-context.interceptor';

/**
 * Audit logging service for Prisma operations.
 * Since Prisma 5.x deprecated $use middleware, we now use a service-based approach
 * that can be called directly from services/repositories.
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
  private readonly AUDITED_MODELS = [
    'Product',
    'ProductBatch',
    'ProductCategory',
    'Inventory',
    'Warehouse',
    'Location',
    'StockMovement',
    'PurchaseOrder',
    'PurchaseOrderItem',
    'SalesOrder',
    'SalesOrderItem',
    'Shipment',
  ];

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AuditLogService))
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
    this.logger.log(
      `AuditMiddleware initialized. Audited models: ${this.AUDITED_MODELS.join(', ')}`,
    );
    this.logger.log(
      'Note: Prisma 5+ deprecated $use middleware. Using manual audit logging via logOperation().',
    );
  }

  /**
   * Check if a model should be audited
   */
  shouldAudit(model: string): boolean {
    return this.AUDITED_MODELS.includes(model);
  }

  /**
   * Get list of audited models
   */
  getAuditedModels(): string[] {
    return [...this.AUDITED_MODELS];
  }

  /**
   * Log an operation manually. Call this from services/repositories after CUD operations.
   * @param params - Audit log parameters
   */
  async logOperation(params: {
    entityType: string;
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    // Skip if model is not in audit list
    if (!this.AUDITED_MODELS.includes(params.entityType)) {
      return;
    }

    try {
      const context = AuditContextInterceptor.getContext();

      // Mask sensitive data
      const maskedBefore = this.maskSensitiveData(params.before);
      const maskedAfter = this.maskSensitiveData(params.after);

      await this.auditLogService.write({
        timestamp: new Date(),
        correlationId: context?.correlationId,
        entityType: params.entityType,
        entityId: params.entityId || 'unknown',
        action: params.action,
        userId: context?.userId,
        userEmail: context?.userEmail,
        ipAddress: context?.ipAddress,
        method: context?.method,
        path: context?.path,
        before: maskedBefore,
        after: maskedAfter,
        metadata: params.metadata,
      });
    } catch (err) {
      this.logger.error(
        `Failed to write audit log for ${params.entityType}:${params.entityId}`,
        err,
      );
    }
  }

  /**
   * Log CREATE operation
   */
  async logCreate(
    entityType: string,
    entity: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const entityId = (entity as { id?: string }).id;
    await this.logOperation({
      entityType,
      entityId: entityId || 'unknown',
      action: 'CREATE',
      before: null,
      after: entity,
      metadata,
    });
  }

  /**
   * Log UPDATE operation
   */
  async logUpdate(
    entityType: string,
    entityId: string,
    before: Record<string, unknown> | null,
    after: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.logOperation({
      entityType,
      entityId,
      action: 'UPDATE',
      before,
      after,
      metadata,
    });
  }

  /**
   * Log DELETE operation
   */
  async logDelete(
    entityType: string,
    entityId: string,
    before: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.logOperation({
      entityType,
      entityId,
      action: 'DELETE',
      before,
      after: null,
      metadata,
    });
  }
}
