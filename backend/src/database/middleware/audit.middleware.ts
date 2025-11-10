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

  // Entities to audit (excluding StockMovement as it's already an audit trail)
  private readonly AUDITED_MODELS = [
    'Product',
    'ProductBatch',
    'ProductCategory',
    'Inventory',
    'Warehouse',
    'Location',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

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
              before: beforeState,
              after: action === 'delete' ? null : result,
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
