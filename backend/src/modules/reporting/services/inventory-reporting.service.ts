import { Injectable, Logger } from '@nestjs/common';
import { InventoryService } from '../../inventory/services/inventory.service';
import { CacheService } from '../../../cache/cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '../../../cache/cache.constants';
import {
  LowStockReportDto,
  ExpiryReportDto,
  StockLevelReportDto,
  MovementReportDto,
  ValuationReportDto,
} from '../dto/inventory-report.dto';

@Injectable()
export class InventoryReportingService {
  private readonly logger = new Logger(InventoryReportingService.name);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Low Stock Report
   * Delegates to InventoryService.getLowStockAlerts()
   */
  async getLowStockReport(dto: LowStockReportDto) {
    this.logger.log(`Generating low stock report with threshold: ${dto.threshold}`);

    const cacheKey = {
      prefix: CACHE_PREFIX.REPORT,
      key: `low-stock:${dto.locationId || 'all'}:${dto.productId || 'all'}:${dto.threshold}:${dto.page}:${dto.limit}`,
    };

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Delegate to InventoryService (reuse existing logic)
        return this.inventoryService.getLowStockAlerts(dto);
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }

  /**
   * Expiry Report
   * Delegates to InventoryService.getExpiryAlerts()
   */
  async getExpiryReport(dto: ExpiryReportDto) {
    this.logger.log(`Generating expiry report for ${dto.daysAhead} days ahead`);

    const cacheKey = {
      prefix: CACHE_PREFIX.REPORT,
      key: `expiry:${dto.locationId || 'all'}:${dto.productId || 'all'}:${dto.daysAhead}:${dto.page}:${dto.limit}`,
    };

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Delegate to InventoryService (reuse existing logic)
        return this.inventoryService.getExpiryAlerts(dto);
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }

  /**
   * Stock Level Report
   * Delegates to InventoryService.getStockLevelReport()
   */
  async getStockLevelReport(dto: StockLevelReportDto) {
    this.logger.log(`Generating stock level report grouped by: ${dto.groupBy}`);

    const cacheKey = {
      prefix: CACHE_PREFIX.REPORT,
      key: `stock-levels:${dto.locationId || 'all'}:${dto.productId || 'all'}:${dto.groupBy}:${dto.page}:${dto.limit}`,
    };

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Delegate to InventoryService (reuse existing logic)
        return this.inventoryService.getStockLevelReport(dto);
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }

  /**
   * Movement Report
   * Delegates to InventoryService.getMovementReport()
   */
  async getMovementReport(dto: MovementReportDto) {
    this.logger.log(
      `Generating movement report from ${dto.startDate || 'all'} to ${dto.endDate || 'all'}`,
    );

    const cacheKey = {
      prefix: CACHE_PREFIX.REPORT,
      key: `movements:${dto.startDate || 'all'}:${dto.endDate || 'all'}:${dto.locationId || 'all'}:${dto.productId || 'all'}:${dto.movementType || 'all'}:${dto.page}:${dto.limit}`,
    };

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Delegate to InventoryService (reuse existing logic)
        return this.inventoryService.getMovementReport(dto);
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }

  /**
   * Valuation Report
   * Delegates to InventoryService.getValuationReport()
   */
  async getValuationReport(dto: ValuationReportDto) {
    this.logger.log(`Generating valuation report using method: ${dto.method}`);

    const cacheKey = {
      prefix: CACHE_PREFIX.REPORT,
      key: `valuation:${dto.locationId || 'all'}:${dto.productId || 'all'}:${dto.method}:${dto.page}:${dto.limit}`,
    };

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Delegate to InventoryService (reuse existing logic)
        return this.inventoryService.getValuationReport(dto);
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }
}
