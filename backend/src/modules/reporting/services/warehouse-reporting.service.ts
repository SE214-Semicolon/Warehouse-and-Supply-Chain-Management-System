import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CacheService } from '../../../cache/cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '../../../cache/cache.constants';
import { WarehouseUtilizationReportDto } from '../dto/warehouse-report.dto';

@Injectable()
export class WarehouseReportingService {
  private readonly logger = new Logger(WarehouseReportingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Warehouse Utilization Report
   * Analyzes warehouse capacity usage and occupancy rates
   */
  async getWarehouseUtilizationReport(dto: WarehouseUtilizationReportDto) {
    this.logger.log(`Generating warehouse utilization report`);

    const cacheKey = {
      prefix: CACHE_PREFIX.REPORT,
      key: `warehouse-utilization:${dto.warehouseId || 'all'}:${dto.page}:${dto.limit}`,
    };

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const skip = ((dto.page || 1) - 1) * (dto.limit || 20);
        const take = dto.limit || 20;

        // Query warehouses
        const where = dto.warehouseId ? { id: dto.warehouseId } : {};

        const [warehouses, total] = await Promise.all([
          this.prisma.warehouse.findMany({
            where,
            skip,
            take,
            include: {
              locations: {
                include: {
                  inventory: {
                    select: {
                      availableQty: true,
                      reservedQty: true,
                    },
                  },
                },
              },
            },
          }),
          this.prisma.warehouse.count({ where }),
        ]);

        // Calculate utilization metrics for each warehouse
        const utilizationData = warehouses.map((warehouse) => {
          let totalCapacity = 0;
          let usedCapacity = 0;
          let locationCount = 0;
          let occupiedLocationCount = 0;

          warehouse.locations.forEach((location) => {
            locationCount++;
            totalCapacity += location.capacity || 0;

            const currentOccupancy = location.inventory.reduce(
              (sum, inv) => sum + inv.availableQty + inv.reservedQty,
              0,
            );

            usedCapacity += currentOccupancy;

            if (currentOccupancy > 0) {
              occupiedLocationCount++;
            }
          });

          const utilizationRate =
            totalCapacity > 0 ? parseFloat(((usedCapacity / totalCapacity) * 100).toFixed(2)) : 0;

          const occupancyRate =
            locationCount > 0
              ? parseFloat(((occupiedLocationCount / locationCount) * 100).toFixed(2))
              : 0;

          const availableCapacity = totalCapacity - usedCapacity;

          return {
            warehouseId: warehouse.id,
            warehouseCode: warehouse.code,
            warehouseName: warehouse.name,
            totalCapacity,
            usedCapacity,
            availableCapacity,
            utilizationRate, // Percentage
            locationCount,
            occupiedLocationCount,
            occupancyRate, // Percentage
          };
        });

        // Sort by the specified field
        const sortField = dto.sortBy || 'utilizationRate';
        const sortOrder = dto.sortOrder || 'desc';

        utilizationData.sort((a, b) => {
          const aValue = a[sortField as keyof typeof a] as number;
          const bValue = b[sortField as keyof typeof b] as number;
          return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
        });

        const totalPages = Math.ceil(total / take);

        return {
          success: true,
          utilizationData,
          total,
          page: dto.page || 1,
          limit: take,
          totalPages,
        };
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }
}
