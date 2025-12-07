import { Injectable, Logger } from '@nestjs/common';
import { AlertRepository } from '../repositories/alert.repository';
import { AlertType, AlertSeverity } from '../schemas/alert.schema';
import { PrismaService } from '../../../database/prisma/prisma.service';

export interface LowStockCheckResult {
  shouldAlert: boolean;
  severity?: AlertSeverity;
  message?: string;
}

export interface ExpiryCheckResult {
  shouldAlert: boolean;
  severity?: AlertSeverity;
  message?: string;
}

@Injectable()
export class AlertGenerationService {
  private readonly logger = new Logger(AlertGenerationService.name);

  constructor(
    private readonly alertRepo: AlertRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Check if low stock alert should be created for a specific inventory
   * Test cases:
   * - ALERTGEN-TC01: availableQty <= minStockLevel * 0.5 → CRITICAL
   * - ALERTGEN-TC02: availableQty <= minStockLevel → WARNING
   * - ALERTGEN-TC03: availableQty > minStockLevel → No alert
   * - ALERTGEN-TC04: Product without minStockLevel → No alert
   * - ALERTGEN-TC05: minStockLevel = 0 → No alert
   */
  async checkLowStockAlert(params: {
    productBatchId: string;
    locationId: string;
    availableQty: number;
  }): Promise<LowStockCheckResult> {
    try {
      const { productBatchId, locationId, availableQty } = params;

      // Get product batch with product info
      const batch = await this.prisma.productBatch.findUnique({
        where: { id: productBatchId },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              minStockLevel: true,
            },
          },
          inventory: {
            where: {
              locationId,
            },
            include: {
              location: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!batch || !batch.product.minStockLevel || batch.product.minStockLevel <= 0) {
        return { shouldAlert: false };
      }

      const minStock = batch.product.minStockLevel;
      const criticalThreshold = minStock * 0.5;

      let severity: AlertSeverity = AlertSeverity.WARNING; // Default to WARNING
      let shouldAlert = false;

      if (availableQty <= criticalThreshold) {
        severity = AlertSeverity.CRITICAL;
        shouldAlert = true;
      } else if (availableQty <= minStock) {
        severity = AlertSeverity.WARNING;
        shouldAlert = true;
      }

      if (!shouldAlert) {
        return { shouldAlert: false };
      }

      const locationInfo = batch.inventory[0]?.location;
      const locationName = locationInfo?.name || locationInfo?.code || 'Unknown Location';

      const message = `Low stock alert: ${batch.product.name} (SKU: ${batch.product.sku}) at ${locationName} - ${availableQty} units remaining (threshold: ${minStock})`;

      // Create alert
      await this.alertRepo.write({
        type: AlertType.LOW_STOCK,
        severity,
        message,
        relatedEntity: {
          type: 'Product',
          id: batch.product.id,
        },
      });

      this.logger.log(`Low stock alert created: ${batch.product.sku} - ${severity}`);

      return {
        shouldAlert: true,
        severity,
        message,
      };
    } catch (error) {
      this.logger.error('Error checking low stock alert:', error);
      return { shouldAlert: false };
    }
  }

  /**
   * Check if expiry alert should be created for a specific product batch
   * Test cases:
   * - ALERTGEN-TC06: daysUntilExpiry <= 7 → CRITICAL
   * - ALERTGEN-TC07: daysUntilExpiry <= 30 → WARNING
   * - ALERTGEN-TC08: daysUntilExpiry > 30 → No alert
   * - ALERTGEN-TC09: No expiryDate → No alert
   * - ALERTGEN-TC10: Already expired → CRITICAL
   */
  async checkExpiryAlert(params: {
    productBatchId: string;
    expiryDate: Date;
  }): Promise<ExpiryCheckResult> {
    try {
      const { productBatchId, expiryDate } = params;

      if (!expiryDate) {
        return { shouldAlert: false };
      }

      const now = new Date();
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      let severity: AlertSeverity = AlertSeverity.WARNING; // Default to WARNING
      let shouldAlert = false;

      if (daysUntilExpiry <= 0) {
        severity = AlertSeverity.CRITICAL;
        shouldAlert = true;
      } else if (daysUntilExpiry <= 7) {
        severity = AlertSeverity.CRITICAL;
        shouldAlert = true;
      } else if (daysUntilExpiry <= 30) {
        severity = AlertSeverity.WARNING;
        shouldAlert = true;
      }

      if (!shouldAlert) {
        return { shouldAlert: false };
      }

      // Get product batch info
      const batch = await this.prisma.productBatch.findUnique({
        where: { id: productBatchId },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
            },
          },
        },
      });

      if (!batch) {
        return { shouldAlert: false };
      }

      const expiredText = daysUntilExpiry <= 0 ? 'EXPIRED' : `expires in ${daysUntilExpiry} days`;
      const message = `Product expiry alert: ${batch.product.name} (Batch: ${batch.batchNo || 'N/A'}) ${expiredText}`;

      // Create alert
      await this.alertRepo.write({
        type: AlertType.EXPIRING_SOON,
        severity,
        message,
        relatedEntity: {
          type: 'Product',
          id: batch.product.id,
        },
      });

      this.logger.log(
        `Expiry alert created: ${batch.product.sku} - ${severity} - ${daysUntilExpiry} days`,
      );

      return {
        shouldAlert: true,
        severity,
        message,
      };
    } catch (error) {
      this.logger.error('Error checking expiry alert:', error);
      return { shouldAlert: false };
    }
  }

  /**
   * Scan all inventory for low stock items and generate alerts
   * Used by scheduled jobs
   */
  async generateLowStockAlerts(): Promise<number> {
    this.logger.log('Starting low stock alert generation scan...');

    try {
      // Find all inventory items where availableQty <= product.minStockLevel
      const lowStockInventories = await this.prisma.inventory.findMany({
        where: {
          deletedAt: null,
          productBatch: {
            product: {
              minStockLevel: {
                not: null,
                gt: 0,
              },
            },
          },
        },
        include: {
          productBatch: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  minStockLevel: true,
                },
              },
            },
          },
          location: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      let alertsCreated = 0;

      for (const inventory of lowStockInventories) {
        const minStock = inventory.productBatch.product.minStockLevel!;

        if (inventory.availableQty <= minStock) {
          const result = await this.checkLowStockAlert({
            productBatchId: inventory.productBatchId,
            locationId: inventory.locationId,
            availableQty: inventory.availableQty,
          });

          if (result.shouldAlert) {
            alertsCreated++;
          }
        }
      }

      this.logger.log(`Low stock alert scan completed: ${alertsCreated} alerts created`);
      return alertsCreated;
    } catch (error) {
      this.logger.error('Error generating low stock alerts:', error);
      return 0;
    }
  }

  /**
   * Scan all product batches for expiring items and generate alerts
   * Used by scheduled jobs
   */
  async generateExpiryAlerts(): Promise<number> {
    this.logger.log('Starting expiry alert generation scan...');

    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      // Find all product batches expiring within 30 days
      const expiringBatches = await this.prisma.productBatch.findMany({
        where: {
          expiryDate: {
            not: null,
            lte: thirtyDaysFromNow,
          },
        },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
            },
          },
        },
      });

      let alertsCreated = 0;

      for (const batch of expiringBatches) {
        if (batch.expiryDate) {
          const result = await this.checkExpiryAlert({
            productBatchId: batch.id,
            expiryDate: batch.expiryDate,
          });

          if (result.shouldAlert) {
            alertsCreated++;
          }
        }
      }

      this.logger.log(`Expiry alert scan completed: ${alertsCreated} alerts created`);
      return alertsCreated;
    } catch (error) {
      this.logger.error('Error generating expiry alerts:', error);
      return 0;
    }
  }
}
